import { useCallback, useContext, useEffect, useMemo } from "react"
import { InteractionManager } from "react-native"
import { RouteProp } from "@react-navigation/native"
import { useTranslation } from "react-i18next"

import { SetRouteOrderParams } from "bootworks-common"

import useBootworksApi from "@hooks/useBootworksApi"
import useCacheHandlers from "@hooks/useCacheHandlers"

import type { ProfileScreenNavigationProp, Venue } from "../.."
import { RootStackParamList } from "../../types"
import { _getRouteTenants } from "./useViewModel.private"
import { TenantInstance } from "@services/tenant"

import Toast from "react-native-toast-message"
import useVenueTenants, { TenantList } from "@hooks/useVenueTenants"
import { BaseContext, BaseContextActions } from "@contexts/BaseContext"

export interface RouteOrderRef {
  key: number
  tenantId: string
  tenantName: string
  routeOrder: number
}

export interface ScreenProps {
  route: RouteProp<RootStackParamList, "TenantRouteOrderScreen">
  navigation: ProfileScreenNavigationProp
}

export interface ViewModel {
  handle: number
  routeTenants: RouteOrderRef[]
  saveTenantRouteOrder: (ref: RouteOrderRef[]) => Promise<Venue | void>
  tenantId?: string
}

export default function useViewModel({ navigation, route }: ScreenProps): ViewModel {
  const api = useBootworksApi()
  const { t } = useTranslation()
  const cacheHandlers = useCacheHandlers()
  const { tenants: tenantList } = useVenueTenants({ api }) as { tenants: TenantList }
  const { tenantId } = route.params
  const { dispatch, state } = useContext(BaseContext)
  const { venue } = state

  const routeTenants = useMemo((): RouteOrderRef[] => {
    // get selected tenant's information from tenant list
    const tenant = tenantList?.list.find((ti: TenantInstance) => ti.id === tenantId)
    if (tenant && tenant.tenantClustering) {
      // get tenants in the same cluster route as the selected tenant
      return _getRouteTenants(tenantList.list, tenant.tenantClustering)
    }
    return []
  }, [tenantId, tenantList])

  const onSuccess = useCallback(
    (venueResponse: Venue) => {
      // Update tenantLists throughout the app
      cacheHandlers.handleTenantChange()

      Toast.show({ type: "success", text1: t("TenantRouteOrderScreen.ToastUpdateSuccess") })

      // Update venue in state
      dispatch({
        type: BaseContextActions.VENUE_SELECTED,
        data: venueResponse,
      })
    },
    [cacheHandlers, dispatch, t],
  )

  // Save the new route order
  const saveTenantRouteOrder = useCallback(
    async (rt: RouteOrderRef[]): Promise<Venue | void> => {
      if (!venue || !venue.lastUpdatedAt) {
        throw new Error(t("TenantRouteOrderScreen.VenueErrorMsg"))
      }
      // send tenantId and route order as [string, number]
      const params: SetRouteOrderParams = { tenantRouteOrders: [] }
      rt.forEach((r) => {
        const tro: [string, number | undefined] = [r.tenantId, r.key]
        params.tenantRouteOrders.push(tro)
      })
      try {
        const response = await api.setTenantRouteOrder({
          venueId: venue.id,
          venueLastUpdatedAt: venue.lastUpdatedAt,
          params,
        })
        onSuccess(response)
      } catch (e) {
        Toast.show({ type: "error", text1: t("TenantRouteOrderScreen.ToastUpdateError") })
        console.log(e)
      }
    },
    [venue, t, api, onSuccess],
  )

  // create interaction handle to kill reanimated callbacks
  const handle = InteractionManager.createInteractionHandle()

  useEffect(() => {
    // stop interaction manager upon leaving view
    navigation.addListener("beforeRemove", (e) => {
      if (handle) {
        InteractionManager.clearInteractionHandle(handle)
      }
    })
  }, [navigation, handle])

  return {
    handle,
    routeTenants,
    saveTenantRouteOrder,
    tenantId,
  }
}
