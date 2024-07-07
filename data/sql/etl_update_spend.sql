# Prerequisite
--- Table etl_purchase

# Tables
--- aggregation at transaction level
CREATE TABLE IF NOT EXISTS fact_transaction (
	app_name STRING, 
	date_time TIMESTAMP, 
	player_id INT, 
	player_vip_tier INT, 
	transaction_id STRING, 
	client_name STRING, 
	promotion_id INT, 
	product_id STRING, 
	product_type STRING, 
	product_amount INT, 
	purchase_dollar FLOAT
);

# Tasks
CREATE OR REPLACE TASK process_transaction
WAREHOUSE = 'TASK_WH_DEFAULT'
TIMEZONE = 'UTC'
SCHEDULE = 'USING CRON 10 02 * * * UTC'
AS
CALL process_transaction(DATEADD(day, -1, CURRENT_DATE()), CURRENT_DATE());

CREATE OR REPLACE PROCEDURE process_transaction(start_date DATE, end_date DATE)
RETURNS STRING
LANGUAGE javascript
STRICT
EXECUTE AS caller
AS $$
	var sql_command = 
	-- replace comment with (backtick) `
	MERGE INTO fact_transaction fact
	USING (
		SELECT app_name, player_id, player_vip_tier, transaction_id
		--- aggregation supposedly unnecessary, but here for robustness
		, MAX(date_time) as date_time
		, MAX(client_name) as client_name
		, MAX(promotion_id) as promotion_id
		, MAX(product_id) as product_id
		, MAX(product_type) as product_type
		, SUM(product_amount) as product_amount
		, SUM(purchase_dollar) as purchase_dollar
		FROM etl_purchase
		WHERE date_time >= :1
		  AND date_time < :2
		  AND transaction_id <> ''
		GROUP BY 1, 2, 3, 4
	) today
	   ON fact.date_time BETWEEN DATEADD(day, -7, :1) AND :2
	  AND fact.app_name = today.app_name
	  AND fact.player_id = today.player_id
	  AND COALESCE(fact.player_vip_tier, -1) = COALESCE(today.player_vip_tier, -1)
	  AND fact.transaction_id = today.transaction_id
	WHEN MATCHED THEN UPDATE
		SET fact.client_name = today.client_name, 
		    fact.promotion_id = today.promotion_id, 
		    fact.product_id = today.product_id, 
		    fact.product_type = today.product_type, 
		    fact.product_amount = today.product_amount, 
		    fact.purchase_dollar = today.purchase_dollar
	WHEN NOT MATCHED THEN INSERT
		(app_name, date_time, player_id, player_vip_tier, transaction_id, 
		client_name, promotion_id, product_id, product_type, product_amount, purchase_dollar)
		VALUES (
			today.app_name, 
			today.date_time, 
			today.player_id, 
			today.player_vip_tier, 
			today.transaction_id, 
			today.client_name, 
			today.promotion_id, 
			today.product_id, 
			today.product_type, 
			today.product_amount, 
			today.purchase_dollar
		)
	-- replace comment with (backtick) `
	;
	try {
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
