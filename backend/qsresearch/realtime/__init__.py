"""
QS Research Real-Time Module.

Implements the TIP-Search framework for deadline-aware inference scheduling.
"""

from qsresearch.realtime.models import ModelWrapper
from qsresearch.realtime.scheduler import TIPSearchScheduler
from qsresearch.realtime.tasks import InferenceTask

__all__ = ["InferenceTask", "ModelWrapper", "TIPSearchScheduler"]
