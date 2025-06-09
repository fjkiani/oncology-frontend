
# Onboarding Plan: Automated Clinical Trials Data Pipeline

Welcome to the team! This document outlines your mission: to evolve our clinical trial matching feature from using a static, local dataset to a powerful, automated system that fetches and maintains a comprehensive database of all clinical trials from the National Cancer Institute (NCI).

This is a high-impact project that will ensure our clinicians and AI agents work with the most up-to-date information. You will be replacing our local, file-based ChromaDB with a cloud-native vector database (like AstraDB or pgVector) and building a scheduled data pipeline to keep it current.

---

## The Overall Architecture

The system you will build consists of three main parts:
1.  **The Data Pipeline:** A Python script that fetches data from the NCI API, transforms it, and loads it into our databases.
2.  **The Production Database:** A cloud-based system with two components: our existing SQLite database for metadata and a new cloud vector database (AstraDB or pgVector) for semantic search.
3.  **The Scheduler:** A cron job that runs the data pipeline automatically on a nightly schedule.

---

## Phase 1: Database Setup & Migration

**Objective:** Replace our file-based ChromaDB with a robust, cloud-based vector database. This is a prerequisite for a shared, dynamic data source that the pipeline and the main application can both access.

**Key Tasks:**

1.  **Choose and Set Up a Cloud Vector Database:**
    *   We are moving to a production-ready solution. You'll need to set up one of the following:
        *   **Option A: DataStax AstraDB (Recommended Start):** A managed Cassandra database with built-in vector search capabilities. It's often easier to get started with.
        *   **Option B: pgVector with Supabase:** A powerful option if we want to keep our metadata (from SQLite) and vectors in the same PostgreSQL database.
    *   Create an account, set up a new database, and obtain your connection credentials (API Endpoint, Token/Password, etc.). **Store these securely** as environment variables, do not commit them to code.

2.  **Refactor Database Connection Logic:**
    *   Create a new Python module, e.g., `backend/utils/database_connections.py`.
    *   In this module, write functions to initialize the connection to SQLite and your new cloud vector database. These functions should read credentials from environment variables.
    *   This centralizes our connection logic, so both the pipeline and the main application can reuse it.

**Testing Approach for Phase 1:**

*   **Connection Test:** Create a temporary script (`backend/scripts/test_db_connection.py`) to verify that you can successfully connect to the new database using your new utility module.
*   **CRUD Test (Create, Read, Update, Delete):** In your test script, perform a simple test:
    1.  Create a new collection/table.
    2.  Insert a single mock data object with a vector.
    3.  Query to read the object back.
    4.  Delete the object.
    *   This simple test confirms your credentials, permissions, and network access are all working correctly before you move on.

---

## Phase 2: Build the Core Data Pipeline Script

**Objective:** Create the main ETL (Extract, Transform, Load) script that populates your new databases.

**Key Tasks:**

1.  **Create the Script (`backend/scripts/load_trials_from_api.py`):**
    *   Use our existing script, [`backend/scripts/load_trials_local.py`](mdc:backend/scripts/load_trials_local.py), as a starting template. It contains valuable logic for database setup, text chunking, and embedding creation.
    *   **Extract:** Implement the logic to fetch all trials from the NCI API. You must handle pagination correctly using the `size` and `from` parameters. Be polite and add a small delay (`time.sleep(0.5)`) between API calls.
    *   **Transform:** For each trial, prepare the metadata for SQLite and chunk the eligibility criteria for the vector database. You can reuse the embedding logic from the template script.
    *   **Load:** Use your new database connection module from Phase 1 to load the data. Implement a "wipe and reload" strategy: at the start of the script, clear the old data before loading the new data.

2.  **Implement Robust Logging:**
    *   Use Python's `logging` module to provide detailed status updates (e.g., "Fetching page 5 of 100...", "Loading trial NCT12345...", "Pipeline run completed successfully."). This is essential for debugging scheduled runs.

**Testing Approach for Phase 2:**

*   **Unit Tests:** For the data fetching logic, use `pytest` and `requests-mock` to test your API interaction function without hitting the live NCI API. Test how it handles success, errors, and empty responses.
*   **Staged Integration Test:** Run the full script, but temporarily modify it to only fetch a small number of trials (e.g., 100). After the run, connect to your database GUIs (e.g., AstraDB or Supabase UI) and verify:
    *   The record counts are correct.
    *   The data content looks right.
    *   Randomly check one trial on the NCI website and ensure it matches the data in your databases.

---

## Phase 3: Automation & Scheduling

**Objective:** Configure your pipeline script to run automatically every night.

**Key Tasks:**

1.  **Create a Wrapper Shell Script (`run_pipeline.sh`):**
    *   This script will prepare the environment and execute your Python script. It makes the cron command much cleaner and more reliable.
    *   It should:
        1.  Navigate to your project directory.
        2.  Activate the Python virtual environment (`source venv/bin/activate`).
        3.  Load the necessary environment variables (for DB credentials).
        4.  Execute the Python pipeline script, redirecting output to a log file.
        ```bash
        #!/bin/bash
        cd /path/to/your/project/backend
        source ../venv/bin/activate
        # Load environment variables if needed
        # export ASTRA_DB_TOKEN=... 
        python scripts/load_trials_from_api.py >> /var/log/oncology_copilot/trials_pipeline.log 2>&1
        ```

2.  **Schedule the Cron Job:**
    *   Use `crontab -e` to edit the cron table.
    *   Add an entry to execute your shell script at a set time, for example, 2:00 AM every day.
        ```cron
        0 2 * * * /path/to/your/project/run_pipeline.sh
        ```

**Testing Approach for Phase 3:**

*   **Manual Trigger:** First, run `./run_pipeline.sh` directly from your terminal to ensure the wrapper script itself works perfectly.
*   **Short-Interval Test:** Set the cron job to run 5 minutes in the future. After it runs, immediately check the log file for output and the database for updated timestamps. This confirms the scheduler is working.
*   **Failure Test:** Intentionally introduce an error into your Python script (e.g., a wrong database password) and manually run the wrapper. Verify that the error is correctly captured in your log file.

---

## Phase 4: Application Integration & Final Testing

**Objective:** Connect the main FastAPI application to the new, dynamic database so our agents can use the live data.

**Key Tasks:**

1.  **Update Agent Code:**
    *   Review [`backend/agents/clinical_trial_agent.py`](mdc:backend/agents/clinical_trial_agent.py). This is where the application queries for trials.
    *   Modify it to use your new `database_connections.py` module to connect to the cloud vector database instead of the local ChromaDB.
    *   Ensure the agent reads database credentials from environment variables.

**Testing Approach for Phase 4:**

*   **End-to-End (E2E) System Test:** This is the final verification.
    *   Run the full application (frontend and backend).
    *   Through the user interface, perform searches and test the full patient matching flow with the [`EligibilityDeepDiveAgent`](mdc:backend/agents/eligibility_deep_dive_agent.py).
    *   **Verify:**
        *   Search results are fast and accurate.
        *   The results reflect the comprehensive data from the NCI, not our old mock data.
        *   The full matching process completes successfully for a test patient.
*   **Manual Performance Check:** While using the UI, note the response time for searches. Is it acceptably fast? This provides a baseline understanding of the new database's performance.

Good luck! This project is a fantastic opportunity to build a robust, production-grade data system. Don't hesitate to ask questions.
