# Prerequisite
--- Table fact_daily_key_kpi
--- Table fact_players
--- Table snap_recent_key_kpi

# Tables
CREATE TABLE IF NOT EXISTS metric_daily_key_kpi (
	app_name STRING, 
	date DATE, 
	client_name STRING, 
	country_name STRING, 
	visit_ref_name STRING, 
	exclusion_group STRING, 
	tenure_id STRING, 
	spend_28_id STRING, 
	vip_status_id STRING, 
	payer_type STRING, 
	active_user INT, 
	spinning_user INT, 
	coins_bet INT, 
	coins_won INT, 
	spins INT, 
	sessions INT, 
	payers INT, 
	payments INT, 
	revenue FLOAT
);
CREATE TABLE IF NOT EXISTS metric_weekly_key_kpi (
	app_name STRING, 
	date DATE, 
	client_name STRING, 
	country_name STRING, 
	tenure_id STRING, 
	active_user INT, 
	payers INT, 
	revenue FLOAT
);
CREATE TABLE IF NOT EXISTS metric_monthly_key_kpi (
	app_name STRING, 
	date DATE, 
	client_name STRING, 
	country_name STRING, 
	tenure_id STRING, 
	active_user INT, 
	payers INT, 
	revenue FLOAT
);

# Tasks
CREATE OR REPLACE TASK compute_daily_key_kpi
WAREHOUSE = 'TASK_WH_DEFAULT'
TIMEZONE = 'UTC'
SCHEDULE = 'USING CRON 10 04 * * * UTC'
AS
CALL compute_daily_key_kpi(DATEADD(day, -1, CURRENT_DATE()), CURRENT_DATE());

CREATE OR REPLACE PROCEDURE compute_daily_key_kpi(start_date DATE, end_date DATE)
RETURNS STRING
LANGUAGE javascript
STRICT
EXECUTE AS caller
AS $$
	var sql_delete = 
	-- replace comment with (backtick) `
	DELETE FROM metric_daily_key_kpi
	WHERE date >= :1 AND date < :2
	-- replace comment with (backtick) `
	;
	var sql_insert = 
	-- replace comment with (backtick) `
	INSERT INTO metric_daily_key_kpi
	(app_name, date, client_name, country_name, visit_ref_name, exclusion_group, 
	tenure_id, spend_28_id, vip_status_id, payer_type, 
	active_user, spinning_user, coins_bet, coins_won, spins, sessions, 
	payers, payments, revenue)
	SELECT kpi.app_name, kpi.date
	, COALESCE(player.client_name, kpi.client_name) as client_name
	, player.country_name
	, kpi.visit_ref_name
	, player.exclusion_group
	, bucket_tenure_days(kpi.tenure_days) as tenure_id
	, bucket_purchase_last28d(COALESCE(snap.purchase_dollar, 0.0)) as spend_28_id
	, bucket_putchase_ltd(COALESCE(player.purchase_dollar_ltd, 0.0)) as vip_status_id
	, bucket_last_purchase_date(player.last_purchase_date, CURRENT_DATE()) as payer_type
	, COUNT(DISTINCT kpi.player_id) as active_user
	, COUNT(DISTINCT CASE WHEN kpi.session_count_spin > 0 
	    THEN kpi.player_id ELSE NULL END) as spinning_user
	, SUM(kpi.coin_bet_amount) as coins_bet
	, SUM(kpi.coin_won_amount) as coins_won
	, SUM(kpi.spin_count) as spins
	, SUM(kpi.session_count) as sessions
	, COUNT(DISTINCT CASE WHEN kpi.purchase_dollar > 0 
	    THEN kpi.player_id ELSE NULL END) as payers
	, SUM(kpi.purchase_count) as payments
	, SUM(kpi.purchase_dollar) as revenue
	FROM fact_daily_key_kpi kpi
	LEFT JOIN (
		SELECT app_name, date, player_id
		, SUM(purchase_dollar) as purchase_dollar
		FROM snap_recent_key_kpi
		WHERE n_day_ago BETWEEN 0 AND 28
		GROUP BY 1, 2, 3
	) snap
	       ON kpi.app_name = snap.app_name
	      AND kpi.player_id = snap.player_id
	      AND kpi.date = DATEADD(day, -1, snap.date)
	LEFT JOIN fact_players player
	       ON kpi.app_name = player.app_name
	      AND kpi.player_id = player.player_id
	WHERE kpi.date >= :1
	  AND kpi.date < :2
	GROUP BY 1, 2, 3, 4, 5, 6, 7, 8, 9, 10
	-- replace comment with (backtick) `
	;
	try {
		snowflake.execute ({
			sqlText: sql_delete, 
			binds: [START_DATE.toISOString(), END_DATE.toISOString()]
		});
		snowflake.execute ({
			sqlText: sql_insert, 
			binds: [START_DATE.toISOString(), END_DATE.toISOString()]
		});
		return "Succeeded.";
	}
	catch (err) {
		return "Failed: " + err;
	}
$$;

CREATE OR REPLACE TASK compute_weekly_key_kpi
WAREHOUSE = 'TASK_WH_DEFAULT'
TIMEZONE = 'UTC'
AFTER compute_daily_key_kpi
AS
CALL compute_weekly_key_kpi(DATEADD(day, -1, CURRENT_DATE()), CURRENT_DATE());

CREATE OR REPLACE PROCEDURE compute_weekly_key_kpi(start_date DATE, end_date DATE)
RETURNS STRING
LANGUAGE javascript
STRICT
EXECUTE AS caller
AS $$
	var sql_delete = 
	-- replace comment with (backtick) `
	DELETE FROM metric_weekly_key_kpi
	WHERE date >= DATE_TRUNC('week', DATE(:1)) AND date < :2
	-- replace comment with (backtick) `
	;
	var sql_insert = 
	-- replace comment with (backtick) `
	INSERT INTO metric_weekly_key_kpi
	(app_name, date, client_name, country_name, tenure_id, 
	active_user, payers, revenue)
	SELECT kpi.app_name, DATE_TRUNC('week', kpi.date) as week
	, COALESCE(player.client_name, kpi.client_name) as client_name
	, player.country_name
	, bucket_tenure_days(kpi.tenure_days) as tenure_id
	, COUNT(DISTINCT kpi.player_id) as wau
	, COUNT(DISTINCT CASE WHEN kpi.purchase_dollar > 0 
	    THEN kpi.player_id ELSE NULL END) as payers
	, SUM(kpi.purchase_dollar) as revenue
	FROM fact_daily_key_kpi kpi
	LEFT JOIN fact_players player
	       ON kpi.app_name = player.app_name
	      AND kpi.player_id = player.player_id
	WHERE kpi.date >= DATE_TRUNC('week', DATE(:1)) 
	  AND kpi.date < :2
	GROUP BY 1, 2, 3, 4, 5
	-- replace comment with (backtick) `
	;
	try {
		snowflake.execute ({
			sqlText: sql_delete, 
			binds: [START_DATE.toISOString(), END_DATE.toISOString()]
		});
		snowflake.execute ({
			sqlText: sql_insert, 
			binds: [START_DATE.toISOString(), END_DATE.toISOString()]
		});
		return "Succeeded.";
	}
	catch (err) {
		return "Failed: " + err;
	}
$$;

CREATE OR REPLACE TASK compute_monthly_key_kpi
WAREHOUSE = 'TASK_WH_DEFAULT'
TIMEZONE = 'UTC'
AFTER compute_daily_key_kpi
AS
CALL compute_monthly_key_kpi(DATEADD(day, -1, CURRENT_DATE()), CURRENT_DATE());

CREATE OR REPLACE PROCEDURE compute_monthly_key_kpi(start_date DATE, end_date DATE)
RETURNS STRING
LANGUAGE javascript
STRICT
EXECUTE AS caller
AS $$
	var sql_delete = 
	-- replace comment with (backtick) `
	DELETE FROM metric_monthly_key_kpi
	WHERE date >= DATE_TRUNC('month', DATE(:1)) AND date < :2
	-- replace comment with (backtick) `
	;
	var sql_insert = 
	-- replace comment with (backtick) `
	INSERT INTO metric_monthly_key_kpi
	(app_name, date, client_name, country_name, tenure_id, 
	active_user, payers, revenue)
	SELECT kpi.app_name, DATE_TRUNC('month', kpi.date) as month
	, COALESCE(player.client_name, kpi.client_name) as client_name
	, player.country_name
	, bucket_tenure_days(kpi.tenure_days) as tenure_id
	, COUNT(DISTINCT kpi.player_id) as mau
	, COUNT(DISTINCT CASE WHEN kpi.purchase_dollar > 0 
	    THEN kpi.player_id ELSE NULL END) as payers
	, SUM(kpi.purchase_dollar) as revenue
	FROM fact_daily_key_kpi kpi
	LEFT JOIN fact_players player
	       ON kpi.app_name = player.app_name
	      AND kpi.player_id = player.player_id
	WHERE kpi.date >= DATE_TRUNC('month', DATE(:1)) 
	  AND kpi.date < :2
	GROUP BY 1, 2, 3, 4, 5
	-- replace comment with (backtick) `
	;
	try {
		snowflake.execute ({
			sqlText: sql_delete, 
			binds: [START_DATE.toISOString(), END_DATE.toISOString()]
		});
		snowflake.execute ({
			sqlText: sql_insert, 
			binds: [START_DATE.toISOString(), END_DATE.toISOString()]
		});
		return "Succeeded.";
	}
	catch (err) {
		return "Failed: " + err;
	}
$$;
