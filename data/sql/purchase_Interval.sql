SET (query_date, app_name, product_type_cd) = ('2022-02-10', 'casino', 'gold');

with purchase as (
  SELECT
      purchases.character_id
      , purchases.transaction_id 
      , ROW_NUMBER() OVER (PARTITION BY purchases.character_id ORDER BY dateadd(second, -1 * DATEDIFF(SECOND, SYSDATE(), GETDATE()), purchases.purchase_date)) AS PurchaseNumber
      , dateadd(second, -1 * DATEDIFF(SECOND, SYSDATE(), GETDATE()), purchases.purchase_date) AS transaction_ts
      , SUM(purchases.quantity) AS purchased_chips
      , SUM(purchases.amount) AS gross_bookings_usd_amt
      , COUNT(*) AS num_purchases

  FROM SAG_STAGING_DB.SAG_WORDACE.PURCHASES AS purchases
      LEFT JOIN SAG_STAGING_DB.SAG_WORDACE.PRODUCTS AS R
          ON purchases.product_id = R.product_id --AND R.current_flg = 'Y'
      LEFT JOIN SAG_STAGING_DB.SAG_WORDACE.CHARACTERS AS U
              ON U.character_id = purchases.character_id  
  WHERE CAST(dateadd(second, -1 * DATEDIFF(SECOND, SYSDATE(), GETDATE()), purchases.purchase_date) AS DATE) >= $query_date 
      AND CAST(dateadd(second, -1 * DATEDIFF(SECOND, SYSDATE(), GETDATE()), purchases.purchase_date) AS DATE) <= (DATEADD(day,90,($query_date)))
      AND LOWER(U.app_name) = $app_name --game_name 
      AND LOWER(R.type) = $product_type_cd
      AND LOWER(R.iap_type) = $app_name 
  GROUP BY dateadd(second, -1 * DATEDIFF(SECOND, SYSDATE(), GETDATE()), purchase_date) 
      , purchases.transaction_id
      , purchases.character_id
 ),

tmp as (
  SELECT
      p.character_id
      ,p.transaction_id
      ,p.purchaseNumber
      ,p.transaction_ts AS transaction_ts
      ,cast(SUM(p.gross_bookings_usd_amt) AS FLOAT) AS gross_bookings_usd_amt
      ,cast(SUM(p.num_purchases) as INT) num_purchases
      ,MAX(NextPurchase.transaction_ts) next_purchase_ts
      ,(MAX(datediff(day,CAST(p.transaction_ts AS DATE),CAST(NextPurchase.transaction_ts AS DATE) ))) AS days_to_next_purchase
      ,'CasinoData_transaction_id_audit' AS Sheet 
  FROM purchase AS p
      LEFT JOIN purchase AS NextPurchase
          ON P.character_id = NextPurchase.character_id
          AND P.purchaseNumber = NextPurchase.purchaseNumber-1
  WHERE 1=1
  GROUP BY 
      p.purchaseNumber
      , p.transaction_id
      , p.character_id
      , p.transaction_ts
  ORDER BY p.character_id
),

transaction_day as (
    SELECT
      T.character_id
      ,CAST(T.transaction_ts AS DATE) AS transaction_dt 
      ,cast(SUM(T.gross_bookings_usd_amt) AS FLOAT) AS gross_bookings_usd_amt
      ,cast(SUM(T.num_purchases) as INT) num_purchases
      ,'CasinoData' AS Sheet
  FROM tmp AS T  
  WHERE 1=1
  GROUP BY 
      T.character_ID
      ,CAST(T.transaction_ts AS DATE)
),


transaction_day_2 as (
  SELECT 
    character_id
    , transaction_dt
    , gross_bookings_usd_amt
    , num_purchases
    , LAST_VALUE(transaction_dt) OVER (PARTITION BY CHARACTER_ID ORDER BY TRANSACTION_DT ASC ROWS BETWEEN 1 PRECEDING AND 1 FOLLOWING) next_purchase 
    , sheet
FROM transaction_day
),

character_filter as (
  SELECT TOP 40
  character_id, sum(num_purchases) as purchaseNumber
  FROM transaction_day_2
  GROUP BY character_id
  ORDER BY sum(num_purchases) DESC
)

SELECT
    t.character_id
    , CAST(t.transaction_dt AS DATE) AS transaction_dt	
    , sum(t.gross_bookings_usd_amt) as gross_bookings_usd_amt
    , sum(t.num_purchases) as purchases	
    , CASE WHEN CAST(t.next_purchase AS DATE) = CAST(t.transaction_dt AS DATE) THEN NULL
           ELSE t.next_purchase	
           END AS next_purchase_date	
    , CASE WHEN CAST(t.next_purchase AS DATE) = CAST(t.transaction_dt AS DATE) THEN NULL	
           ELSE datediff(day,t.transaction_dt,t.next_purchase) 	
           END AS days_to_next_purchase	
FROM transaction_day_2 t
INNER JOIN character_filter f ON f.character_id = t.character_id 
GROUP BY t.character_id
    , transaction_dt
    , next_purchase_date
    , days_to_next_purchase
ORDER BY t.character_id, transaction_dt