from __future__ import annotations

import json
import sys

from prophet_core import generate_prophet_dataset

def main() -> None:
    raw = sys.stdin.read().strip()
    config = json.loads(raw) if raw else {}
    dataset = generate_prophet_dataset(config)
    sys.stdout.write(json.dumps(dataset, ensure_ascii=False))


if __name__ == "__main__":
    main()
