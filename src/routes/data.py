from fastapi import FastAPI, APIRouter, Depends, UploadFile, status, Request
from fastapi.responses import JSONResponse
from celery.result import AsyncResult
from uuid import UUID
import os
from helpers.config import get_settings, Settings
from controllers import DataController, ProjectController, ProcessController
import aiofiles
from models import ResponseSignal
import logging
from .schemes.data import ProcessRequest
from models.ProjectModel import ProjectModel
from models.ChunkModel import ChunkModel
from models.AssetModel import AssetModel
from models.db_schemes import DataChunk, Asset
from models.enums.AssetTypeEnum import AssetTypeEnum
from controllers import NLPController
from tasks.file_processing import process_project_files
from tasks.process_workflow import process_and_push_workflow
from celery_app import celery_app

logger = logging.getLogger('uvicorn.error')

data_router = APIRouter(
    prefix="/api/v1/data",
    tags=["api_v1", "data"],
)


def _workflow_marker_key(workflow_task_id: str) -> str:
    return f"minirag:process-workflow:{workflow_task_id}"


def _mark_workflow_submitted(workflow_task_id: str):
    redis_client = getattr(celery_app.backend, "client", None)
    if redis_client is None:
        raise RuntimeError("The Celery result backend does not expose a Redis client")
    redis_client.setex(
        _workflow_marker_key(workflow_task_id),
        int(celery_app.conf.result_expires),
        "1",
    )


def _workflow_was_submitted(workflow_task_id: str) -> bool:
    redis_client = getattr(celery_app.backend, "client", None)
    if redis_client is None:
        raise RuntimeError("The Celery result backend does not expose a Redis client")
    return bool(redis_client.exists(_workflow_marker_key(workflow_task_id)))


def _process_status_response(workflow_task_id: str, task_status: str, message: str):
    is_completed = task_status == "completed"
    return {
        "signal": "process_status",
        "workflow_task_id": workflow_task_id,
        "status": task_status,
        "progress": 100 if is_completed else None,
        "message": message,
    }


def _resolve_terminal_task(workflow_task_id: str):
    outer_result = AsyncResult(workflow_task_id, app=celery_app)
    outer_state = outer_result.state

    if outer_state == "PENDING" and not _workflow_was_submitted(workflow_task_id):
        raise LookupError("The processing workflow was not found")

    if outer_state != "SUCCESS":
        return outer_result

    # First, try to get the terminal task ID from Redis
    redis_client = getattr(celery_app.backend, "client", None)
    terminal_task_id = None
    
    if redis_client:
        redis_key = f"minirag:terminal-task:{workflow_task_id}"
        terminal_task_id = redis_client.get(redis_key)
        if terminal_task_id:
            terminal_task_id = terminal_task_id.decode('utf-8') if isinstance(terminal_task_id, bytes) else terminal_task_id
            logger.info(f"Retrieved terminal task ID from Redis: {redis_key} -> {terminal_task_id}")
    
    # If not in Redis, try to get it from the workflow result
    if not terminal_task_id:
        outer_info = outer_result.info
        terminal_task_id = outer_info.get("terminal_task_id") if isinstance(outer_info, dict) else None
        if not terminal_task_id:
            terminal_task_id = outer_info.get("workflow_id") if isinstance(outer_info, dict) else None
    
    if not isinstance(terminal_task_id, str):
        raise ValueError("The workflow result did not contain a terminal task ID")

    try:
        UUID(terminal_task_id)
    except ValueError as exc:
        raise ValueError("The workflow result contained an invalid terminal task ID") from exc

    return AsyncResult(terminal_task_id, app=celery_app)


@data_router.get("/process-status/{workflow_task_id}")
async def process_status(workflow_task_id: UUID):
    workflow_task_id_value = str(workflow_task_id)

    try:
        task_result = _resolve_terminal_task(workflow_task_id_value)
        task_state = task_result.state
    except LookupError:
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content={
                "signal": "process_status_not_found",
                "workflow_task_id": workflow_task_id_value,
                "message": "The processing workflow was not found.",
            },
        )
    except ValueError as exc:
        logger.error("Unable to resolve terminal task for workflow %s: %s", workflow_task_id_value, exc)
        return JSONResponse(
            status_code=status.HTTP_502_BAD_GATEWAY,
            content={
                "signal": "process_status_unavailable",
                "workflow_task_id": workflow_task_id_value,
                "message": "The processing workflow status could not be resolved.",
            },
        )
    except Exception:
        logger.exception("Unable to read processing status for workflow %s", workflow_task_id_value)
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={
                "signal": "process_status_unavailable",
                "workflow_task_id": workflow_task_id_value,
                "message": "The processing status is temporarily unavailable.",
            },
        )

    if task_state == "SUCCESS":
        response = _process_status_response(
            workflow_task_id_value,
            "completed",
            "Document processing completed successfully.",
        )
    elif task_state in {"FAILURE", "REVOKED"}:
        response = _process_status_response(
            workflow_task_id_value,
            "failed",
            "Document processing failed.",
        )
    elif task_state == "PENDING":
        response = _process_status_response(
            workflow_task_id_value,
            "pending",
            "Document processing is queued.",
        )
    else:
        response = _process_status_response(
            workflow_task_id_value,
            "processing",
            "Document processing is in progress.",
        )

    return JSONResponse(content=response)

@data_router.post("/upload/{project_id}")
async def upload_data(request: Request,
                      project_id: int,
                      file: UploadFile,
                      app_settings: Settings = Depends(get_settings)
                      ):
        
    
    project_model = await ProjectModel.create_instance(
        db_client=request.app.db_client
    )

    project = await project_model.get_project_or_create_one(
        project_id=project_id
    )

    # validate the file properties
    data_controller = DataController()

    is_valid, result_signal = data_controller.validate_uploaded_file(file=file)

    if not is_valid:
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={
                "signal": result_signal
            }
        )

    project_dir_path = ProjectController().get_project_path(project_id=project_id)
    file_path, file_id = data_controller.generate_unique_filepath(
        orig_file_name=file.filename,
        project_id=project_id
    )

    try:
        async with aiofiles.open(file_path, "wb") as f:
            while chunk := await file.read(app_settings.FILE_DEFAULT_CHUNK_SIZE):
                await f.write(chunk)
    except Exception as e:

        logger.error(f"Error while uploading file: {e}")

        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={
                "signal": ResponseSignal.FILE_UPLOAD_FAILED.value
            }
        )

    # store the assets into the database
    asset_model = await AssetModel.create_instance(
        db_client=request.app.db_client
    )

    asset_resource = Asset(
        asset_project_id=project.project_id,
        asset_type=AssetTypeEnum.FILE.value,
        asset_name=file_id,
        asset_size=os.path.getsize(file_path)
    )

    asset_record = await asset_model.create_asset(asset=asset_resource)

    return JSONResponse(
            content={
                "signal": ResponseSignal.FILE_UPLOAD_SUCCESS.value,
                "file_id": str(asset_record.asset_id),
            }
        )

@data_router.post("/process/{project_id}")
async def process_endpoint(request: Request, project_id: int, process_request: ProcessRequest):

    chunk_size = process_request.chunk_size
    overlap_size = process_request.overlap_size
    do_reset = process_request.do_reset

    task = process_project_files.delay(
        project_id=project_id,
        file_id=process_request.file_id,
        chunk_size=chunk_size,
        overlap_size=overlap_size,
        do_reset=do_reset,
    )

    return JSONResponse(
        content={
            "signal": ResponseSignal.PROCESSING_SUCCESS.value,
            "task_id": task.id
        }
    )

@data_router.post("/process-and-push/{project_id}")
async def process_and_push_endpoint(request: Request, project_id: int, process_request: ProcessRequest):

    chunk_size = process_request.chunk_size
    overlap_size = process_request.overlap_size
    do_reset = process_request.do_reset

    workflow_task = process_and_push_workflow.delay(
        project_id=project_id,
        file_id=process_request.file_id,
        chunk_size=chunk_size,
        overlap_size=overlap_size,
        do_reset=do_reset,
    )

    try:
        _mark_workflow_submitted(workflow_task.id)
    except Exception:
        logger.exception("Unable to persist workflow marker for %s", workflow_task.id)

    return JSONResponse(
        content={
            "signal": ResponseSignal.PROCESS_AND_PUSH_WORKFLOW_READY.value,
            "workflow_task_id": workflow_task.id
        }
    )
