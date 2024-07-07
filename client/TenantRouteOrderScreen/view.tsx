import React, { useState, useEffect } from "react"
import { useTranslation } from "react-i18next"
import { View, TouchableOpacity, Text, InteractionManager } from "react-native"
import DraggableFlatList, { RenderItemParams } from "react-native-draggable-flatlist"

import { RouteOrderRef, ViewModel } from "./useViewModel"

import ErrorBoundary from "@components/ErrorBoundary"

import Styles from "@styles/."
import styles from "./styles"

export default function TenantRouteOrderScreen({ handle, routeTenants, saveTenantRouteOrder, tenantId }: ViewModel) {
  const { t } = useTranslation()
  const [tenants, setTenants] = useState<RouteOrderRef[]>(routeTenants)
  const [initialAnimationsSet, setInitialAnimationsSet] = useState<boolean>(false)

  useEffect(() => {
    let isMounted = true
    // handles issue w/ reanimated and draggable list
    // issue: https://github.com/computerjazz/react-native-draggable-flatlist/issues/209
    // reference: https://reactnative.dev/docs/interactionmanager
    if (isMounted && handle) {
      setInitialAnimationsSet(true)
    }
    return () => {
      isMounted = false
      InteractionManager.clearInteractionHandle(handle)
    }
  }, [handle])

  useEffect(() => {
    if (initialAnimationsSet && routeTenants?.length) {
      setTenants(routeTenants)
    }
  }, [initialAnimationsSet, routeTenants])

  const renderItem = ({ item, index, drag, isActive }: RenderItemParams<RouteOrderRef>) => {
    // default background color
    let itemColor = styles.item.backgroundColor

    // if dragging, change background color to indicate active
    // also highlight the tenant the user wanted to move (unless dragging)
    if (isActive) {
      itemColor = styles.activeColor.backgroundColor
    } else if (tenantId === item.tenantId) {
      itemColor = styles.selectedTenant.backgroundColor
    }
    return (
      <View style={styles.container}>
        <TouchableOpacity
          accessibilityLabel="draggable-item"
          onLongPress={drag}
          style={{
            ...styles.item,
            backgroundColor: itemColor,
          }}
        >
          <Text style={styles.itemLabel}>{item.tenantName}</Text>
        </TouchableOpacity>
      </View>
    )
  }

  if (!tenants || !tenants.length) {
    return null
  }

  return (
    <ErrorBoundary>
      <View style={styles.container}>
        {initialAnimationsSet && (
          <DraggableFlatList
            accessibilityLabel="draggable-list"
            data={tenants}
            renderItem={renderItem}
            keyExtractor={(item, index) => `${item.tenantId}-${index}`}
            onDragEnd={({ data }) => {
              data.forEach((item, idx) => (item.key = idx + 1))
              setTenants(data)
            }}
          />
        )}
        <TouchableOpacity
          style={{ ...Styles.primaryButton, ...styles.saveButton }}
          onPress={() => saveTenantRouteOrder(tenants)}
        >
          <Text accessibilityLabel="saveBtn" style={styles.textBtnColor}>
            {t("TenantRouteOrderScreen.SaveButton")}
          </Text>
        </TouchableOpacity>
      </View>
    </ErrorBoundary>
  )
}
