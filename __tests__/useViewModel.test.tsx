import React from "react"
import { renderHook } from "@testing-library/react-hooks"

import useViewModel, { RouteOrderRef, ScreenProps } from "../useViewModel"
import { MockUseQuery } from "@mocks/_mock.reactQuery"
import MockBaseContext from "@mocks/_mock.basecontext"
import { CacheKeys } from "@services/api.types"

import { MockVenues } from "@mocks/_mock.util"
import { BaseState, VenueCompact } from "index"
import { BaseProvider } from "@contexts/BaseContext"
import { TenantList } from "@hooks/useVenueTenants"
import MockZoneLocations from "@mocks/_mock.zoneLocations"
import { act } from "@testing-library/react-native"
import { InteractionManager } from "react-native"

jest.mock("@hooks/useLocalHTMLFile", () => jest.fn().mockImplementation(() => "MOCK-HTML"))
jest.mock("@hooks/useFeedsAPI")
jest.mock("@react-navigation/native")

let mockScreenProps: ScreenProps

const mockNavigation = { navigate: jest.fn(), addListener: jest.fn() }
const mockSaveTenantRouteOrder = jest.fn()
const mockUseQuery = new MockUseQuery()
const mockTenantList = new TenantList(MockVenues[0].tenants)
const mockCluster = {
  Cluster: "🐷 5",
  "Sub Cluster": "A",
}
export const mockRouteTenants: RouteOrderRef[] = [
  {
    key: 0,
    tenantId: MockVenues[0].tenants[0].id,
    tenantName: MockVenues[0].tenants[0].name,
    routeOrder: MockVenues[0].tenants[0].routeOrder || 0,
  },
  {
    key: 1,
    tenantId: MockVenues[0].tenants[1].id,
    tenantName: MockVenues[0].tenants[1].name,
    routeOrder: MockVenues[0].tenants[1].routeOrder || 0,
  },
]

// @ts-ignore
mockTenantList.list[0].tenantClustering = mockCluster
// @ts-ignore
mockTenantList.list[1].tenantClustering = mockCluster

const mockState = {
  venue: MockVenues[0] as VenueCompact,
} as BaseState

mockUseQuery.addResponse({
  matcher: CacheKeys.VENUE_ZONE_LOCATIONS,
  responseData: [],
})

mockUseQuery.addResponse({
  matcher: CacheKeys.VENUE_TENANTS_LIST,
  responseData: mockTenantList,
})
mockUseQuery.addResponse({
  matcher: CacheKeys.VENUE_ZONE_LOCATIONS,
  responseData: MockZoneLocations,
})

jest.mock("react", () => ({
  ...jest.requireActual("react"),
  useContext: () => ({ ...MockBaseContext, state: { venue: MockVenues[0] } }),
}))

const wrapper = ({ children }: { children: any }) => (
  <BaseProvider testState={mockState} disableStorage={true}>
    {children}
  </BaseProvider>
)

describe("TenantRouteOrderScreen.useViewModel", () => {
  beforeEach(() => {
    mockScreenProps = {
      navigation: mockNavigation,
      route: {
        params: {
          handle: 1,
          routeTenants: mockRouteTenants,
          saveTenantRouteOrder: mockSaveTenantRouteOrder,
          tenantId: MockVenues[0].tenants[0].id,
        },
      },
    } as unknown as ScreenProps
  })

  it("should return model params", async () => {
    expect.assertions(1)
    const hook = renderHook(() => useViewModel(mockScreenProps), { wrapper }).result.current

    expect(Object.keys(hook)).toEqual(["handle", "routeTenants", "saveTenantRouteOrder", "tenantId"])
  })

  it("should clear interaction manager on navigation", async () => {
    expect.assertions(2)
    const imSpy = jest.spyOn(InteractionManager, "clearInteractionHandle")
    const hook = renderHook(() => useViewModel(mockScreenProps), { wrapper }).result.current
    // @ts-ignore
    const listener = mockScreenProps.navigation.addListener.mock.calls[0][1]
    act(() => {
      listener()
    })
    expect(hook.handle).toBeDefined()
    expect(imSpy).toHaveBeenCalled()
  })

  it("should set routeTenants based on tenantId and tenantList", async () => {
    expect.assertions(1)
    const hook = renderHook(() => useViewModel(mockScreenProps), { wrapper }).result.current
    mockRouteTenants.forEach((r, idx) => (r.key = idx + 1))
    mockRouteTenants.sort((a, b) => (a.routeOrder > b.routeOrder ? 1 : -1))
    expect(hook.routeTenants).toStrictEqual(mockRouteTenants)
  })

  it("should attempt to save", async () => {
    expect.assertions(1)
    const hook = renderHook(() => useViewModel(mockScreenProps), { wrapper }).result.current
    act(() => {
      hook.saveTenantRouteOrder(mockRouteTenants)
    })
    expect(hook.saveTenantRouteOrder).toBeTruthy()
  })
})
