import { TouchableOpacity } from "react-native"
import styles from "@screens/TenantRouteOrderScreen/styles"
import { Text } from "@components/Themed"
import React from "react"
import { useTranslation } from "react-i18next"

const ChangeRouteOrderBtn = ({ onChangeTenantRouteOrderPress }: { onChangeTenantRouteOrderPress?: () => void }) => {
  const { t } = useTranslation()
  if (!onChangeTenantRouteOrderPress) {
    return null
  }
  return (
    <TouchableOpacity
      accessibilityLabel={t("TenantRouteOrderScreen.ChangeRouteButton")}
      style={styles.changeRouteOrderBtn}
      onPress={onChangeTenantRouteOrderPress}
    >
      <Text style={styles.changeRouteOrderText}>{t("TenantRouteOrderScreen.ChangeRoute")}</Text>
    </TouchableOpacity>
  )
}

export default ChangeRouteOrderBtn
