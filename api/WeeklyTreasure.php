<?php

class WeeklyTreasure extends BaseFeature
{
    const COINS       = 'coins';
    const BINGO_BALLS = 'bingo_balls';
    const CHIP_DROP   = 'chip_drop';
    const COUPONS     = 'coupons';

    public function getInfo(Player $player)
    {
        $returnForfeit = false;
        $playerData = $this->getPlayerData($player);

        if (!isset($playerData->release) || $playerData->release !== Config::get('weekly_treasure.release', 1))
            $playerData = $this->reInitPlayerData($player, $playerData);

        $featureData = $this->getFeatureData(Config::get('weekly_treasure.version', 1));

        // If past treasure date, reinitialize player data
        $treasureEndDate = $this->getTreasureEndDate($playerData);
        if (PSLDate::getTimeSince($treasureEndDate) >= 0)
        {
            $returnForfeit = true;
            $silverForfeit = $this->getForfeitStatus($player, $playerData, 'silver');
            $goldForfeit   = $this->getForfeitStatus($player, $playerData, 'gold');

            if (isset($playerData->admin_feature))
            {
                $playerData = $this->reInitPlayerData($player, $playerData);
                $this->adminSet($player, $featureData->reset_day, $playerData);
            }
            else
            {
                $playerData = $this->reInitPlayerData($player, $playerData);
            }
        }

        $newDay            = new DateTime();
        $now               = PSLDate::toString($newDay);
        $secondsPerDay     = Config::get('weekly_treasure.seconds_per_day', 86400);
        $adminDays         = PSLDate::getTimeSince($playerData->last_silver_collect_date) >= $secondsPerDay;
        $weekdayIndex      = isset($playerData->admin_feature) ? $this->getCalculatedIndex($player, $playerData) : PSLDate::getDayOfWeekIndex();
        $currentDay        = isset($playerData->admin_feature) ? $this->convertToWeekDay($weekdayIndex): PSLDate::getDayOfWeekName();
        $daysEnd           = isset($playerData->admin_feature) ? $secondsPerDay - PSLDate::getTimeBetween($playerData->admin_feature->current_day_date, $now) :
                             PSLDate::getTimeUntil(PSLDate::toString($newDay->setTime(23, 59, 59)));
        $showDialog        = false;
        $is_dirty          = false;
        $silverKeys        = isset($playerData->keys->silver_keys) ? $this->convertToWeekDay($playerData->keys->silver_keys) : array();
        $goldKeys          = isset($playerData->keys->gold_keys) ? $this->convertToWeekDay($playerData->keys->gold_keys) : array();
        $treasureDay       = $weekdayIndex === $this->getIndex($featureData->treasure_day);
        $missedDays        = $this->getMissedDays($player, $playerData, $treasureDay);
        $missingSilverKeys = $missedDays->silver;
        $missingGoldKeys   = $missedDays->gold;
        $winningKeys       = isset($playerData->winning_keys->collected) ? $playerData->winning_keys->collected : null;
        $silverCollected   = isset($winningKeys->silver) ? $winningKeys->silver : false;
        $goldCollected     = isset($winningKeys->gold) ? $winningKeys->gold : false;
        $silverPrizes      = isset($playerData->prizes_received->silver) && !empty($playerData->prizes_received->silver) ? $playerData->prizes_received->silver : '';
        $goldPrizes        = isset($playerData->prizes_received->gold) && !empty($playerData->prizes_received->gold) ? $playerData->prizes_received->gold : '';
        $pendingSilver     = $treasureDay && (in_array($currentDay, $missingSilverKeys) && empty($silverPrizes)); // check if player has acquired their silver key on treasure day
        $pendingGold       = $treasureDay && (in_array($currentDay, $missingGoldKeys) && empty($goldPrizes)); // check if player has acquired their gold key on treasure day
        $silverStatus      = count($silverKeys) > 0 || !$treasureDay || $pendingSilver ? 'pending' : ($silverCollected ? 'success' : 'failed');
        $goldStatus        = count($goldKeys) > 0 || !$treasureDay || $pendingGold ? 'pending' : ($goldCollected ? 'success' : 'failed');
        $abEndDate         = Config::get('weekly_treasure.ab_end_date', PSLDate::addTime($playerData->treasure_date, 1, PSLDate::CALENDAR_DAYS));

        // Save current day's index if new day
        if ($playerData->dayIndex !== $weekdayIndex)
        {
            $playerData->dayIndex = $weekdayIndex;
            $is_dirty = true;
        }

        if (PSLDate::getTimeSince($playerData->last_seen_date, PSLDate::MINUTES) >= $featureData->intro_dialog_cooldown)
        {
            $playerData->last_seen_date = $now;

            $showDialog = true;
            $is_dirty = true;
        }

        if ($is_dirty)
        {
            $this->savePlayerData($player, $playerData);
        }

        $returnData = array(
            'show_dialog'                => $showDialog,
            'silver_keys_collected'      => $silverKeys,
            'gold_keys_collected'        => $goldKeys,
            'silver_missed_days'         => $treasureDay ? $playerData->missed_days->silver : $missingSilverKeys,
            'gold_missed_days'           => $treasureDay ? $playerData->missed_days->gold : $missingGoldKeys,
            'seconds_remaining'          => ($featureData->intro_dialog_cooldown * 60) - PSLDate::getTimeSince($playerData->last_seen_date),
            'seconds_until_treasure_day' => $treasureDay ? 0 : PSLDate::getTimeBetween($now, $playerData->treasure_date),
            'treasure_day'               => $featureData->treasure_day,
            'current_day'                => $currentDay,
            'seconds_until_end_of_day'   => $daysEnd,
            'silver_chest_status'        => $silverStatus,
            'gold_chest_status'          => $goldStatus,
            'silver_prizes_won'          => !empty($silverPrizes) ? $silverPrizes : new stdClass(),
            'gold_prizes_won'            => !empty($goldPrizes) ? $goldPrizes : new stdClass(),
            'weeks'                      => $playerData->weeks,
            'feature_seconds_remaining'  => PSLDate::getTimeUntil($abEndDate),

        );

        if ($returnForfeit)
        {
            $returnData['silver_chest_forfeited'] = $silverForfeit;
            $returnData['gold_chest_forfeited'] = $goldForfeit;
        }

        return $returnData;
    }

    /**
     * @event CanvasPlayerInfoEvent
     * @event MobilePlayerInfoEvent
     */
    public function basePlayerInfo(BasePlayerInfoEvent $event)
    {
        return $this->getInfo($event->player);
    }

    public function collectKey(Player $player, $keyType, $goDirty)
    {
        $playerData   = $this->getPlayerData($player);
        $weekdayIndex = isset($playerData->admin_feature) ? $this->getCalculatedIndex($player, $playerData) : $playerData->dayIndex;
        $keyName      = $keyType . '_keys';
        $keyDate      = 'last_' . $keyType . '_collect_date';
        $goldKey      = $keyType === 'gold' && isset($playerData->honeydo_index);
        $keyIndex     = $goldKey ? $playerData->honeydo_index : $weekdayIndex;
        $missingDays  = isset($playerData->missed_days->{$keyType}) ? $playerData->missed_days->{$keyType} : array();
        $featureData  = $this->getFeatureData(Config::get('weekly_treasure.version', 1));
        $treasureDay  = $featureData->treasure_day;
        $collected    = isset($playerData->winning_keys->collected->{$keyType}) ? $playerData->winning_keys->collected->{$keyType} : false;
        $canCollect   = !$collected && !isset($playerData->prizes_received->{$keyType});
        $adminDays    = PSLDate::getTimeSince($playerData->{$keyDate}) >= Config::get('weekly_treasure.seconds_per_day', 86400);
        $dayPassed    = isset($playerData->admin_feature) ? $adminDays : PSLDate::getTimeSince($playerData->{$keyDate}, PSLDate::CALENDAR_DAYS) > 0;

        if ($dayPassed)
        {
            if (!isset($playerData->keys->{$keyName}))
                $playerData->keys->{$keyName} = array();

            if (!in_array($keyIndex, $playerData->keys->{$keyName}) && $canCollect)
            {
                $playerData->keys->{$keyName}[] = $keyIndex;
                $playerData->{$keyDate} = $this->getNow($playerData);

                if ($goldKey)
                    $playerData->honeydo_index = null;

                // If key collected on treasure day, unset the treasure day from missed days
                if ($keyIndex === $this->getIndex($treasureDay) && !empty($missingDays))
                {
                    $index = array_search($treasureDay, $missingDays);
                    unset($missingDays[$index]);
                    $playerData->missed_days->{$keyType} = array_values($missingDays);
                }

                if ($goDirty)
                    $playerData->dirty = true;

                $this->savePlayerData($player, $playerData);

                if (!$goDirty)
                    return $this->getInfo($player);
            }
        }
    }

    /**
     * @event HeartbeatEvent
     */
    public function heartbeat(HeartbeatEvent $event)
    {
        return $this->heartbeatWithoutTimer($event);
    }

    public function collectTreasure(Player $player, $keyType, $keyDay)
    {
        $playerData   = $this->getPlayerData($player);
        $featureData  = $this->getFeatureData(Config::get('weekly_treasure.version', 1));
        $returnData   = array();
        $features     = array();
        $canTryAgain  = false;
        $keyIndex     = $this->getIndex($keyDay);
        $keyName      = $keyType . '_keys';
        $playerKeys   = isset($playerData->keys->$keyName) ? $playerData->keys->$keyName : array();
        $winningIndex = $playerData->winning_keys->{$keyType};
        $winningKey   = $keyIndex === $winningIndex && in_array($keyIndex, $playerKeys);
        $collected    = isset($playerData->winning_keys->collected->{$keyType}) ? $playerData->winning_keys->collected->{$keyType} : false;
        $prizesWon    = isset($playerData->prizes_received->{$keyType}) && !empty($playerData->prizes_received->{$keyType}) ? true : false;
        $treasureDay  = $playerData->dayIndex === $this->getIndex($featureData->treasure_day);
        $canCollect   = !$collected && $treasureDay && count($playerKeys) > 0 && !$prizesWon;
        $missedDays   = $this->getMissedDays($player, $playerData, $treasureDay);
        $weekdayIndex = isset($playerData->admin_feature) ? $this->getCalculatedIndex($player, $playerData) : PSLDate::getDayOfWeekIndex();
        $currentDay   = isset($playerData->admin_feature) ? $this->convertToWeekDay($weekdayIndex): PSLDate::getDayOfWeekName();
        $unusedKeys   = count($playerKeys);
        $pendingKey   = in_array($currentDay, $missedDays->{$keyType});

        // If treasure day, a prize has not been collected and keys are available, allow play
        if ($canCollect)
        {
            //Remove used key
            $key = array_search($keyIndex, $playerKeys);
            unset($playerKeys[$key]);
            $playerData->keys->$keyName = array_values($playerKeys);

            $unusedKeys       = count($playerKeys);
            $unusedKeyReward  = $unusedKeys * $featureData->prizes->{$keyType}->per_unused_key;
            $consolationPrize = isset($featureData->prizes->{$keyType}->consolation_prize) ? $featureData->prizes->{$keyType}->consolation_prize : 0;
            $consolation      = !$unusedKeys && ($consolationPrize > 0) && $canCollect;

            if (empty($playerData->winning_keys->collected))
                $playerData->winning_keys->collected = new stdClass();

            // If player has the winning key, give them the treasure and reward them for any unused keys
            if ($winningKey)
            {
                $collected      = true;
                $pendingKey     = false;
                $prizeDepot     = PrizeDepot::loadOrDie($featureData->prizes->{$keyType}->depot_version);
                if ($keyType === 'silver')
                {
                    $seed = $featureData->prizes->{$keyType}->depot_seed;
                }
                else
                {
                    $metricFeature = FeatureSystem::getByName(BaseFeatureController::PLAYER_METRICS);
                    $mixed = $metricFeature->grabLastMixedMetric($player);                    
                    $seed = $mixed->average_bet;
                }
                $prizesReceived  = $prizeDepot->createPrizeBundle($player, $seed, $featureData->prizes->{$keyType}->depot_tier);
                $prizeDepot->awardPrizeBundle($player, $this, $prizesReceived);

                $prizesReceived['total_coin_reward'] = (isset($prizesReceived['credits']) ? $prizesReceived['credits'] : 0) + $unusedKeyReward;
                $prizesReceived['unused_key_reward'] = array(
                    'count'            => $unusedKeys,
                    'award_per_key'    => $featureData->prizes->{$keyType}->per_unused_key,
                    'total_key_reward' => $unusedKeyReward
                );
                $player->addCredits($unusedKeyReward);
                $this->dispatchEvent(new NonSpinCoinsAwardedEvent($player, $unusedKeyReward));

                $playerData->winning_keys->collected->{$keyType} = $collected;
                $playerData->prizes_received->{$keyType} = (object)$prizesReceived;
            }
            // If player does not have the winning key but has more keys available, let them try again
            elseif ($unusedKeys)
            {
                $canTryAgain = true;
            }
            // If player has used all their keys to no avail and there is a consolation prize, allow them to collect it
            elseif ($consolation && !$pendingKey)
            {
                $playerData->prizes_received->{$keyType} = (object)array('consolation' => $consolationPrize);
                $player->addCredits($consolationPrize);
                $this->dispatchEvent(new NonSpinCoinsAwardedEvent($player, $consolationPrize));
            }

            // If tried all keys or prize has been collected, unset keys and return client winning key (game over)
            if (!$canTryAgain && !$pendingKey)
            {
                unset($playerData->keys->$keyName);
                $playerData->winning_keys->collected->{$keyType} = $collected;
            }
        }

        $this->savePlayerData($player, $playerData);

        $playerConsolation = isset($playerData->prizes_received->{$keyType}->consolation) ? $playerData->prizes_received->{$keyType}->consolation : array();
        $treasurePrizes = empty($playerConsolation) && isset($playerData->prizes_received->{$keyType}) ? $playerData->prizes_received->{$keyType} : array();

        $features[$this->getFeatureName()]['has_winning_key'] = $winningKey || $treasurePrizes;
        $features[$this->getFeatureName()]['can_try_again']   = $canTryAgain;
        $features[$this->getFeatureName()][$keyName] = isset($playerData->keys->$keyName) ? $playerData->keys->$keyName : array();
        $features[$this->getFeatureName()][$keyType . '_chest_status'] = $winningKey || $treasurePrizes  ? 'success' : ($unusedKeys || $pendingKey && !$winningKey ? 'pending' : 'failed');
        $features[$this->getFeatureName()]['treasure_prizes'] = $treasurePrizes;
        $features[$this->getFeatureName()]['consolation_prize'] = $playerConsolation;

        //In case of spam, only send to client if truly game over
        if (!$canTryAgain && !$pendingKey && !$unusedKeys)
            $features[$this->getFeatureName()]['winning_key_day'] = $this->convertToWeekDay($winningIndex);

        $returnData['status'] = 'ok';
        $returnData['player'] = array('credits' => $player->credits);
        $returnData['features'] = $features;

        return $returnData;
    }

    public function refresh(Player $player)
    {
        return array(
            'status'   => 'ok',
            'features' => array($this->getFeatureName() => $this->getInfo($player)),
        );
    }

    public function getIndex($day)
    {
        return $index = ((int)date('w', strtotime($day)) + 6) % 7;
    }

    public function convertToWeekDay($indexKeys)
    {
        $dayKeys  = array();
        $weekdays = array('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday');

        if (is_array($indexKeys))
        {
            foreach ($indexKeys as $key => $value)
            {
                $dayKeys[] = $weekdays[$value];
            }
        }
        else
        {
            $dayKeys = $weekdays[$indexKeys];
        }

        return $dayKeys;
    }

    /**
     * @event HoneyDoCompleteEvent
     */
    public function honeyDoComplete(HoneyDoCompleteEvent $event)
    {
        $player = $event->player;
        $playerData = $this->getPlayerData($player);
        $playerData->honeydo_index = $playerData->dayIndex;
        $this->savePlayerData($player, $playerData);
    }

    /**
     * @event HoneyDoCollectEvent
     */
    public function honeyDoCollect(HoneyDoCollectEvent $event)
    {
        // Auto-collect key
        $this->collectKey($event->player, 'gold', true);
    }

    /**
     * @event DailyBonusCollectEvent
     */
    public function dailyBonusCollect(DailyBonusCollectEvent $event)
    {
        // Auto-collect key
        return $this->collectKey($event->player, 'silver', false);
    }

    public function getTreasureEndDate($playerData)
    {
        $treasureDate = $playerData->treasure_date;

        // If testing, use seconds_per_day. Otherwise set to the end of the treasure day.
        if (isset($playerData->admin_feature->date))
        {
            $treasureEndDate = PSLDate::addTime($treasureDate, Config::get('weekly_treasure.seconds_per_day', 86400));
        }
        else
        {
            $treasureEndDate = PSLDate::toObject($treasureDate);
            $treasureEndDate->setTime(23, 59, 59);
            $treasureEndDate = PSLDate::toString($treasureEndDate);
        }

        return $treasureEndDate;
    }

    public function getCalculatedIndex($player, $playerData)
    {
        $secondsPassed = PSLDate::getTimeSince($playerData->admin_feature->date);
        $startDay = $playerData->admin_feature->start_day;
        $secondsPerDay = Config::get('weekly_treasure.seconds_per_day', 86400);
        $days = (int)floor($secondsPassed / $secondsPerDay);

        $playerData->admin_feature->current_day = date('l', strtotime($startDay . "+{$days} day"));
        $calIndex = $this->getIndex($playerData->admin_feature->current_day);

        if ($playerData->dayIndex !== $calIndex)
        {
            // Zero out seconds
            $date = PSLDate::addTime($playerData->admin_feature->date, $days * $secondsPerDay);
            $date = PSLDate::toObject($date);
            $date->setTime($date->format('H'), $date->format('i'), 0);
            $now = PSLDate::toString($date);

            // Reset daily bonus and honey do
            FeatureSystem::getByName(BaseFeatureController::DAILY_BONUS)->resetWeeklyTreasure($player, $now);

            if (Config::get('honey_do.enabled', false))
                FeatureSystem::getByName(BaseFeatureController::HONEY_DO)->adminFlushWeeklyTreasure($player, $now, $secondsPerDay);

            if (Config::get('honey_do_v3.enabled', false))
                FeatureSystem::getByName(BaseFeatureController::HONEY_DO_V3)->adminFlushWeeklyTreasure($player, $now, $secondsPerDay);

            $playerData->dayIndex = $calIndex;
            $playerData->admin_feature->current_day_date = $now;
        }

        $this->savePlayerData($player, $playerData);

        return $calIndex;
    }

    public function getNow($playerData)
    {
        if (isset($playerData->admin_feature->date))
        {
            $secondsPassed = PSLDate::getTimeSince($playerData->admin_feature->date);
            $secondsPerDay = Config::get('weekly_treasure.seconds_per_day', 86400);
            $days = (int)floor($secondsPassed / $secondsPerDay);

            $date = PSLDate::addTime($playerData->admin_feature->date, $days * $secondsPerDay);
            $date = PSLDate::toObject($date);
            $date->setTime($date->format('H'), $date->format('i'), 0);
            $now = PSLDate::toString($date);
        }
        else
        {
            $now = PSLDate::toString(new DateTime());
        }

        return $now;
    }

    public function getMissedDays($player, $playerData, $treasureDay)
    {
        if (isset($playerData->missed_days))
        {
            $missedDays = $playerData->missed_days;
        }
        else
        {
            $range = $this->convertToWeekDay(range(0, 6));
            $silverKeys = isset($playerData->keys->silver_keys) ? $this->convertToWeekDay($playerData->keys->silver_keys) : array();
            $goldKeys = isset($playerData->keys->gold_keys) ? $this->convertToWeekDay($playerData->keys->gold_keys) : array();
            $missedSilver = !empty($silverKeys) ? array_values(array_diff($range, $silverKeys)) : array_values($range);
            $missedGold = !empty($goldKeys) ? array_values(array_diff($range, $goldKeys)) : array_values($range);

            // On treasure day, save down the final missing keys since they will be unset on each unlock attempt
            if ($treasureDay)
            {
                $playerData->missed_days = new stdClass();
                $playerData->missed_days->silver = $missedSilver;
                $playerData->missed_days->gold = $missedGold;

                $this->savePlayerData($player, $playerData);
            }

            $missedDays = (object)array(
                'silver' => $missedSilver,
                'gold'   => $missedGold,
            );
        }

        return $missedDays;
    }

    public function getForfeitStatus(Player $player, $playerData, $keyType)
    {
        $playerKeys = isset($playerData->keys->{$keyType . '_keys'}) ? $this->convertToWeekDay($playerData->keys->{$keyType . '_keys'}) : null;
        $unmissedDays = 7 - (isset($playerData->missed_days->{$keyType}) ? count($playerData->missed_days->{$keyType}) : 0);

        if (isset($playerData->admin_feature->date))
        {
            $secondsPassed = PSLDate::getTimeBetween($playerData->admin_feature->current_day_date, $playerData->treasure_date);
            $daysSinceTreasureDay = (int)floor($secondsPassed / Config::get('weekly_treasure.seconds_per_day', 86400));
        }
        else
        {
            $daysSinceTreasureDay = PSLDate::getTimeBetween($player->getPreviousLoginDate(), $playerData->treasure_date, PSLDate::CALENDAR_DAYS);
        }

        if (!isset($playerData->winning_keys->collected->{$keyType}))
        {
            if (!is_null($playerKeys) && $daysSinceTreasureDay > 0)
            {
                // Player has keys and missed treasure day
                $status = 'missed_treasure_day';
            }
            elseif (!is_null($playerKeys) && $daysSinceTreasureDay === 0 && (count($playerKeys) === $unmissedDays))
            {
                // Player has keys, did not miss treasure day but did not use keys
                $status = 'no_collect_dialog';
            }
            else
            {
                // Since treasure collected was not set and player did not fall into above categories, can assume
                // player used some keys or used all collected keys but still had the pending treasure day key to use
                $status = 'collect_dialog_incomplete';
            }
        }
        else
        {
            $status = 'no_forfeit';
        }

        return $status;
    }

    public function adminReset(Player $player)
    {
        $this->initPlayerData($player);
        return array('status' => 'ok');
    }

    public function adminSet(Player $player, $day = null, $playerData = null, $featureData = null)
    {
        $weekday = $day;
        if (!isset($weekday))
        {
            $week_day = $this->getPOSTData('weekday');
            $weekday = isset($week_day['weekday']) ? array_pop($week_day) : $_GET['weekday'];
        }

        if (is_null($weekday))
            return array('status' => 'error');

        $dayIndex      = $this->getIndex($weekday);
        $secondsPerDay = Config::get('weekly_treasure.seconds_per_day', 86400);
        $featureData   = !is_null($featureData) ? $featureData : $this->getFeatureData(Config::get('weekly_treasure.version', 1));
        $playerData    = !is_null($playerData) ? $playerData : $this->getPlayerData($player);
        $resetDay      = $featureData->reset_day;
        $treasureDay   = $dayIndex === $featureData->treasure_day;

        // Zero out seconds
        $date = new DateTime();
        $date->setTime($date->format('H'), $date->format('i'), 0);
        $now = PSLDate::toString($date);

        // Use variable index to calculate admin and treasure dates
        $weekdays = array(
            $resetDay,
            date('l',strtotime($resetDay.'+1 day')),
            date('l',strtotime($resetDay.'+2 day')),
            date('l',strtotime($resetDay.'+3 day')),
            date('l',strtotime($resetDay.'+4 day')),
            date('l',strtotime($resetDay.'+5 day')),
            date('l',strtotime($resetDay.'+6 day')),
        );

        $adminDate = PSLDate::subtractTime($now, array_search($weekday, $weekdays) * $secondsPerDay);

        $treasureDate = PSLDate::addTime($adminDate, 6 * $secondsPerDay);

        if ($treasureDay)
        {
            $this->getMissedDays($player, $playerData, $treasureDay);
        }

        // Reset daily bonus and honey do
        FeatureSystem::getByName(BaseFeatureController::DAILY_BONUS)->resetWeeklyTreasure($player, $now);

        if (Config::get('honey_do.enabled', false))
            FeatureSystem::getByName(BaseFeatureController::HONEY_DO)->adminFlushWeeklyTreasure($player, $now, $secondsPerDay);

        if (Config::get('honey_do_v3.enabled', false))
            FeatureSystem::getByName(BaseFeatureController::HONEY_DO_V3)->adminFlushWeeklyTreasure($player, $now, $secondsPerDay);

        $playerData->admin_feature = new stdClass();
        $playerData->dayIndex = $dayIndex;
        $playerData->treasure_date = $treasureDate;
        $playerData->admin_feature->date = $now;
        $playerData->admin_feature->current_day_date = $now;
        $playerData->admin_feature->start_day = $weekday;
        $playerData->last_silver_collect_date = PSLDate::EXPIRED_DATE;
        $playerData->last_gold_collect_date = PSLDate::EXPIRED_DATE;
        $playerData->prizes_received = new stdClass();
        $this->savePlayerData($player, $playerData);

        return array('status' => 'ok');
    }

    public function adminSelect(Player $player)
    {
        $status = array('status' => 'error');

        $mon = $this->getPOSTData('Monday');
        $tue = $this->getPOSTData('Tuesday');
        $wed = $this->getPOSTData('Wednesday');
        $thu = $this->getPOSTData('Thursday');
        $fri = $this->getPOSTData('Friday');
        $sat = $this->getPOSTData('Saturday');
        $sun = $this->getPOSTData('Sunday');

        $postData = array(
            'Monday'    => isset($mon['Monday']) ? array_pop($mon) : $_POST['Monday'] ,
            'Tuesday'   => isset($tue['Tuesday']) ? array_pop($tue) : $_POST['Tuesday'],
            'Wednesday' => isset($wed['Wednesday']) ? array_pop($wed) : $_POST['Wednesday'],
            'Thursday'  => isset($thu['Thursday']) ? array_pop($thu) : $_POST['Thursday'],
            'Friday'    => isset($fri['Friday']) ? array_pop($fri) : $_POST['Friday'],
            'Saturday'  => isset($sat['Saturday']) ? array_pop($sat) : $_POST['Saturday'],
            'Sunday'    => isset($sun['Sunday']) ? array_pop($sun) : $_POST['Sunday'],
        );

        // Winning Treasure Keys
        $gold = $this->getPOSTData('gold');
        $goldKey = isset($gold['gold']) ? array_pop($gold) : $_POST['gold'];

        $silver = $this->getPOSTData('silver');
        $silverKey = isset($silver['silver']) ? array_pop($silver) : $_POST['silver'];

        if (!empty($postData))
        {
            $playerData = $this->getPlayerData($player);
            $playerData->keys->silver_keys = array();
            $playerData->keys->gold_keys = array();

            $featureData = $this->getFeatureData(Config::get('weekly_treasure.version', 1));

            foreach ($postData as $key => $value)
            {
                if ($value === 'both')
                {
                    $index = $this->getIndex($key);
                    $playerData->keys->silver_keys[] = $index;
                    $playerData->keys->gold_keys[] = $index;
                }
                elseif ($value === 'gold' || $value === 'silver')
                {
                    $index = $this->getIndex($key);
                    $playerData->keys->{$value . '_keys'}[] = $index;
                }
            }

            $playerData->winning_keys->gold = !empty($goldKey) && $goldKey !== 'Auto-select' ? $this->getIndex($goldKey) : $playerData->winning_keys->gold;
            $playerData->winning_keys->silver = !empty($silverKey) && $silverKey !== 'Auto-select' ? $this->getIndex($silverKey) : $playerData->winning_keys->silver;

            $status = $this->adminSet($player, $featureData->treasure_day, $playerData, $featureData);
        }

        return $status;
    }

    protected function reInitPlayerData(Player $player, $playerData)
    {
        $lastSeen = $playerData->last_seen_date;
        $weeks = $playerData->weeks++;

        $playerData = $this->initPlayerData($player);

        $playerData->last_seen_date = $lastSeen;
        $playerData->weeks = $weeks;

        $this->savePlayerData($player, $playerData);

        return $playerData;
    }

    protected function initPlayerData(Player $player)
    {
        $abEndDate   = Config::get('weekly_treasure.ab_end_date', null);
        $featureData = $this->getFeatureData(Config::get('weekly_treasure.version', 1));

        $now = new DateTime();
        $now->setTime(0, 0, 0);

        $resetDay = $featureData->reset_day;

        // Use variable index to calculate start and treasure dates
        $weekdays = array(
            $resetDay,
            date('l',strtotime($resetDay.'+1 day')),
            date('l',strtotime($resetDay.'+2 day')),
            date('l',strtotime($resetDay.'+3 day')),
            date('l',strtotime($resetDay.'+4 day')),
            date('l',strtotime($resetDay.'+5 day')),
            date('l',strtotime($resetDay.'+6 day')),
        );

        $startDate = PSLDate::subtractTime($now, array_search(PSLDate::getDayOfWeekName(), $weekdays), PSLDate::CALENDAR_DAYS);

        $treasureDate = PSLDate::addTime($startDate, 6, PSLDate::CALENDAR_DAYS);

        // If treasure date is after the AB end date, use the AB end date to allow players one last time to collect
        if (!is_null($abEndDate) && PSLDate::getTimeBetween($abEndDate, $treasureDate) > 0)
        {
            $treasureDate = PSLDate::toObject($abEndDate);
            $treasureDate = $treasureDate->setTime(0, 0, 0);
        }

        $winningKeys = array(
            'silver' => mt_rand(0, 6),
            'gold'   => mt_rand(0, 6),
        );

        $playerData = (object)array(
            'keys'                     => new stdClass(),
            'winning_keys'             => $winningKeys,
            'last_seen_date'           => PSLDate::EXPIRED_DATE,
            'last_silver_collect_date' => PSLDate::EXPIRED_DATE,
            'last_gold_collect_date'   => PSLDate::EXPIRED_DATE,
            'start_date'               => PSLDate::toString($startDate),
            'treasure_date'            => PSLDate::toString($treasureDate),
            'honeydo_index'            => null,
            'dayIndex'                 => PSLDate::getDayOfWeekIndex(),
            'prizes_received'          => new stdClass(),
            'weeks'                    => 0,
            'release'                  => Config::get('weekly_treasure.release', 1),
        );

        $this->savePlayerData($player, $playerData);
        return $playerData;
    }
}
