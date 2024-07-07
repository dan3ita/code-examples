SET start_date = '2022-10-17';

with installs as (
  SELECT
    date,
    app_name AS app,
    CASE WHEN country_name in ('AU','CA','FR','DE','NZ','GB','US') THEN country_name ELSE 'ROW' END AS country,
    marketing_channel,
    SUM(installs) as total_installs
  FROM SAG_PRODUCTION_DB.PUBLIC.METRIC_DAILY_INSTALL
  WHERE date >= $start_date
  GROUP BY 1,2,3,4
),

ad_mon as (
  SELECT 
    report_date as date,
    CASE
        WHEN app_name LIKE 'Big Fish Casino%' then 'casino'
        WHEN app_name LIKE 'Jackpot%' then 'slotzilla'
        ELSE app_name 
    END AS app,
    CASE WHEN country in ('AU','CA','FR','DE','NZ','GB','US') THEN country ELSE 'ROW' END AS country,
    SUM(REVENUE_AMT) as ad_revenue
  FROM GAMES_DB.PARTNER.RPT_IRONSOURCE_AD_REVENUE
  WHERE app_name LIKE 'Big Fish Casino%' OR app_name LIKE 'Jackpot Magic Slots%'
  GROUP BY 1,2,3
),

ua_cost as (
  SELECT
    REGISTRATION_DATE::date as date, 
    CASE 
        WHEN game = 'Big Fish Casino' then 'casino'
        WHEN game = 'Jackpot Magic Slots' then 'slotzilla'
        ELSE game
    END AS app,
    CASE WHEN country in ('AU','CA','FR','DE','NZ','GB','US') THEN country ELSE 'ROW' END AS country,
    SUM(spend) as spend
  FROM GAMES_DB.PARTNER.MKT_SPEND_TABLE
  WHERE game LIKE 'Big Fish Casino%' OR game LIKE 'Jackpot Magic Slots%'
  GROUP BY 1,2,3
),

kpi as (
  SELECT
    date,
    app_name AS app,
    CASE WHEN country_name in ('AU','CA','FR','DE','NZ','GB','US') THEN country_name ELSE 'ROW' END AS country,
    SUM(revenue) AS iap,
    SUM(active_user) AS  players,
    SUM(payers) AS spenders
  FROM SAG_PRODUCTION_DB.PUBLIC.METRIC_DAILY_KEY_KPI
  WHERE date >= $start_date
  GROUP BY 1,2,3
)

SELECT
  a.date
  , a.app
  , a.country
  , ROUND(SUM(iap), 2) AS inapp_bookings
  , ROUND(SUM(ad_revenue), 2) AS admon_bookings
  , ROUND(SUM(iap + ad_revenue), 2) AS total_bookings
  , ROUND(SUM(spend), 2) AS ua_spend
  , SUM(players) AS  engagement
  , SUM(spenders) AS payers
  , SUM(CASE WHEN upper(marketing_channel) <> 'ORGANIC' THEN total_installs ELSE 0 END) AS paid_installs
  , SUM(total_installs) AS blended_installs
FROM kpi a 
LEFT JOIN installs b
    ON a.date = b.date AND a.app = b.app AND a.country = b.country
LEFT JOIN ad_mon c
    ON a.date = c.date AND a.app = c.app AND a.country = c.country
LEFT JOIN ua_cost d 
    ON a.date = d.date AND a.app = d.app AND a.country = d.country
WHERE a.date >= $start_date
GROUP BY 1,2,3
ORDER BY 1,2,3;