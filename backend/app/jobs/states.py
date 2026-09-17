from enum import Enum


class JobStatus(str, Enum):
    RECEIVED = "RECEIVED"
    VALIDATING = "VALIDATING"
    PROCESSING = "PROCESSING"
    UPLOADING = "UPLOADING"
    VERIFYING_URLS = "VERIFYING_URLS"
    READY = "READY"
    PUBLISHING = "PUBLISHING"
    PUBLISHED = "PUBLISHED"
    FAILED = "FAILED"
    CLEANUP = "CLEANUP"


# Valid allowed state transitions
ALLOWED_TRANSITIONS = {
    JobStatus.RECEIVED: {JobStatus.VALIDATING, JobStatus.FAILED},
    JobStatus.VALIDATING: {JobStatus.PROCESSING, JobStatus.FAILED},
    JobStatus.PROCESSING: {JobStatus.UPLOADING, JobStatus.FAILED},
    JobStatus.UPLOADING: {JobStatus.VERIFYING_URLS, JobStatus.FAILED},
    JobStatus.VERIFYING_URLS: {JobStatus.READY, JobStatus.FAILED},
    JobStatus.READY: {JobStatus.PUBLISHING, JobStatus.FAILED},
    JobStatus.PUBLISHING: {JobStatus.PUBLISHED, JobStatus.FAILED},
    JobStatus.PUBLISHED: {JobStatus.CLEANUP, JobStatus.FAILED},
    JobStatus.CLEANUP: set(),  # Terminal state
    JobStatus.FAILED: set(),   # Terminal state
}


def can_transition(current: JobStatus, target: JobStatus) -> bool:
    """Verifies whether a status transition is valid."""
    return target in ALLOWED_TRANSITIONS.get(current, set())
