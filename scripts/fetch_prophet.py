from __future__ import annotations

from prophet_core import OUTPUT_PATH, PROJECT_ROOT, write_dataset


def main() -> None:
    dataset = write_dataset()
    print(
        f"Gerado {OUTPUT_PATH.relative_to(PROJECT_ROOT)} com "
        f"{len(dataset['history'])} pontos historicos e "
        f"{dataset['config']['horizonBusinessDays']} pregoes projetados."
    )


if __name__ == "__main__":
    main()
