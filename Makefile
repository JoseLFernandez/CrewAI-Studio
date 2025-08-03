.PHONY: test

test:
	pytest --cov=backend --cov-report=term-missing
