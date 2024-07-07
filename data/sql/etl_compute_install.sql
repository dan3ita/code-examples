# Prerequisite
--- Table fact_daily_install

# Tables
CREATE TABLE IF NOT EXISTS metric_daily_install (
	app_name STRING, 
	date DATE, 
	client_name STRING, 
	country_name STRING, 
	marketing_channel STRING, 
	installs INT
);

# Tasks
CREATE OR REPLACE TASK compute_daily_install
WAREHOUSE = 'TASK_WH_DEFAULT'
TIMEZONE = 'UTC'
SCHEDULE = 'USING CRON 10 04 * * * UTC'
AS 
CALL compute_daily_install(DATEADD(day, -90, CURRENT_DATE()), CURRENT_DATE());

CREATE OR REPLACE PROCEDURE compute_daily_install(start_date DATE, end_date DATE)
RETURNS STRING
LANGUAGE javascript
STRICT
EXECUTE AS caller
AS $$
	var sql_remove = `DELETE FROM metric_daily_install WHERE date >= :1 AND date < :2`;
	var sql_command = 
	-- replace comment with (backtick) `
	MERGE INTO metric_daily_install metric
	USING (
		SELECT install.app_name, install.date
		, install.client_name
		, install.country_name
		, ua.marketing_channel
		, COUNT(DISTINCT install.device_id) as installs
		FROM fact_daily_install install
		LEFT JOIN fact_daily_client_install ua
		  ON install.app_name = ua.app_name
		 AND install.player_id = ua.player_id
		 AND ua.date >= :1
		 AND ua.date < :2
		WHERE install.date >= :1
		  AND install.date < :2
		GROUP BY 1, 2, 3, 4, 5
	) fact
	   ON metric.app_name = fact.app_name
	  AND metric.date = fact.date
	  AND COALESCE(metric.client_name, '') = COALESCE(fact.client_name, '')
	  AND COALESCE(metric.country_name, '') = COALESCE(fact.country_name, '')
	  AND COALESCE(metric.marketing_channel, '') = COALESCE(fact.marketing_channel, '')
	WHEN MATCHED THEN UPDATE
		SET metric.installs = fact.installs
	WHEN NOT MATCHED THEN INSERT
		(app_name, date, client_name, country_name, marketing_channel, installs)
		VALUES (
			fact.app_name, 
			fact.date, 
			fact.client_name, 
			fact.country_name, 
			fact.marketing_channel, 
			fact.installs
		)
	-- replace comment with (backtick) `
	;
	try {
		snowflake.execute ({
			sqlText: sql_remove, 
			binds: [START_DATE.toISOString(), END_DATE.toISOString()]
		});
		snowflake.execute ({
			sqlText: sql_command, 
			binds: [START_DATE.toISOString(), END_DATE.toISOString()]
		});
		return "Succeeded.";
	}
	catch (err) {
		return "Failed: " + err;
	}
$$;
