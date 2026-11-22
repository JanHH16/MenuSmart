import os
from dataclasses import dataclass
from typing import Self

DEFAULT_USER_AGENT = "MenuSmartBot/1.0 (+https://github.com/JanHH16/MenuSmart)"


@dataclass(frozen=True)
class ScraperSettings:
    user_agent: str = DEFAULT_USER_AGENT
    min_interval_seconds: float = 1.0
    timeout_seconds: float = 10.0
    max_retries: int = 2
    retry_backoff_seconds: float = 0.5
    max_response_bytes: int = 5_000_000

    @classmethod
    def from_env(cls) -> Self:
        return cls(
            user_agent=os.getenv("SCRAPER_USER_AGENT", DEFAULT_USER_AGENT),
            min_interval_seconds=float(os.getenv("SCRAPER_MIN_INTERVAL_SECONDS", "1.0")),
            timeout_seconds=float(os.getenv("SCRAPER_TIMEOUT_SECONDS", "10")),
            max_retries=int(os.getenv("SCRAPER_MAX_RETRIES", "2")),
        )
