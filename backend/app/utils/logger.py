import logging
import sys


def get_logger(name: str) -> logging.Logger:
    """
    Factory that returns a Python Logger with INFO level and a consistent
    JSON-style format. Ensures handlers are not duplicated if called multiple times.
    """
    logger = logging.getLogger(name)

    if logger.handlers:
        return logger

    logger.setLevel(logging.INFO)

    handler = logging.StreamHandler(sys.stdout)
    handler.setLevel(logging.INFO)

    fmt = (
        '{"time": "%(asctime)s", "level": "%(levelname)s", '
        '"logger": "%(name)s", "message": "%(message)s"'
        '%(extra_fields)s}'
    )

    class JsonStyleFormatter(logging.Formatter):
        def format(self, record: logging.LogRecord) -> str:
            # Collect any extra fields passed via extra={}
            standard_keys = {
                "name", "msg", "args", "levelname", "levelno", "pathname",
                "filename", "module", "exc_info", "exc_text", "stack_info",
                "lineno", "funcName", "created", "msecs", "relativeCreated",
                "thread", "threadName", "processName", "process", "message",
                "asctime", "extra_fields",
            }
            extras = {
                k: v for k, v in record.__dict__.items() if k not in standard_keys
            }
            extra_str = ""
            if extras:
                parts = ", ".join(f'"{k}": "{v}"' for k, v in extras.items())
                extra_str = f", {parts}"
            record.extra_fields = extra_str
            return super().format(record)

    formatter = JsonStyleFormatter(
        '{"time": "%(asctime)s", "level": "%(levelname)s", '
        '"logger": "%(name)s", "message": "%(message)s"%(extra_fields)s}'
    )
    handler.setFormatter(formatter)
    logger.addHandler(handler)
    logger.propagate = False

    return logger
