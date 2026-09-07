from celery import chain
from celery_app import celery_app, get_setup_utils
from helpers.config import get_settings
import asyncio
from tasks.file_processing import process_project_files
from tasks.data_indexing import _index_data_content

import logging
logger = logging.getLogger(__name__)

@celery_app.task(
                 bind=True, name="tasks.process_workflow.push_after_process_task",
                 autoretry_for=(Exception,),
                 retry_kwargs={'max_retries': 3, 'countdown': 60}
                )
def push_after_process_task(self, prev_task_result, outer_workflow_id=None):

    # Store the terminal task ID in Redis so it can be retrieved later
    if outer_workflow_id:
        redis_client = getattr(celery_app.backend, "client", None)
        if redis_client:
            redis_key = f"minirag:terminal-task:{outer_workflow_id}"
            redis_client.setex(redis_key, 3600, self.request.id)
            logger.info(f"Terminal task stored its ID in Redis: {redis_key} -> {self.request.id}")

    project_id = prev_task_result.get("project_id")
    do_reset = prev_task_result.get("do_reset")

    task_results = asyncio.run(
        _index_data_content(self, project_id, do_reset)
    )

    return {
        "project_id": project_id,
        "do_reset": do_reset,
        "task_results": task_results
    }


@celery_app.task(
                 bind=True, name="tasks.process_workflow.process_and_push_workflow",
                 autoretry_for=(Exception,),
                 retry_kwargs={'max_retries': 3, 'countdown': 60}
                )
def process_and_push_workflow(  self, project_id: int, 
                                file_id: int, chunk_size: int,
                                overlap_size: int, do_reset: int):

    # Create the chain tasks
    first_task = process_project_files.s(project_id, file_id, chunk_size, overlap_size, do_reset)
    second_task = push_after_process_task.s()
    
    workflow = chain(first_task, second_task)

    result = workflow.apply_async()
    
    # Store the terminal task ID in Redis after the chain executes
    # We need to wait a moment for the chain to be scheduled and get the actual task IDs
    # The chain's result.children will contain the actual tasks after scheduling
    terminal_task_id = result.id  # Default to chain ID
    
    try:
        # Give the chain a moment to schedule tasks
        import time
        time.sleep(0.1)
        
        # Refresh the result to get children
        result.backend.ensure_fresh()
        
        # Try to get the terminal task ID from the chain's children
        if hasattr(result, 'children') and result.children:
            # The chain's children should contain the actual tasks
            # The last child should be the terminal task
            # However, children might be a chain itself, so we need to traverse
            chain_child = result.children[0] if result.children else None
            if chain_child and hasattr(chain_child, 'children') and chain_child.children:
                # The chain's children contain the actual tasks
                # The last task is the terminal task
                terminal_task_id = chain_child.children[-1].id if chain_child.children else result.id
                logger.info(f"Extracted terminal task ID from chain children: {terminal_task_id}")
                
                # Store in Redis for later retrieval
                redis_client = getattr(celery_app.backend, "client", None)
                if redis_client:
                    redis_key = f"minirag:terminal-task:{result.id}"
                    redis_client.setex(redis_key, 3600, terminal_task_id)
                    logger.info(f"Stored terminal task ID in Redis: {redis_key} -> {terminal_task_id}")
    except Exception as e:
        logger.warning(f"Could not extract/store terminal task ID: {e}")
    
    return {
        "signal": "WORKFLOW_STARTED",
        "workflow_id": result.id,
        "terminal_task_id": terminal_task_id,
        "tasks": ["tasks.file_processing.process_project_files", 
                  "tasks.data_indexing.index_data_content"]
    }

