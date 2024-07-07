import React from "react"
import { render } from "@testing-library/react-native"

import { RouteOrderRef, ScreenProps, ViewModel } from "../useViewModel"
import { MockUseQuery } from "@mocks/_mock.reactQuery"

import { MockVenues } from "@mocks/_mock.util"
import { BaseState, VenueCompact } from "index"
import { BaseProvider } from "@contexts/BaseContext"
import { CacheKeys } from "@services/api.types"
import { TenantList } from "@hooks/useVenueTenants"
import TenantRouteOrderScreen from ".."

jest.mock("@hooks/useFeedsAPI")
const mockState = {
  venue: MockVenues[0] as VenueCompact,
} as BaseState

jest.mock("react-native-draggable-flatlist")

const wrapper = ({ children }: { children: any }) => (
  <BaseProvider testState={mockState} disableStorage={true}>
    {children}
  </BaseProvider>
)

const renderView = (mockPropsInput: ScreenProps) => {
  return render(<TenantRouteOrderScreen navigation={mockPropsInput.navigation} route={mockPropsInput.route} />, {
    wrapper: wrapper,
  })
}

let mockProps: ScreenProps
let mockViewModel: ViewModel
let mockUseQuery = new MockUseQuery() // has side effects
const mockTenantList = new TenantList(MockVenues[0].tenants)
const saveTenantRouteOrder = jest.fn()
export const mockRouteTenants: RouteOrderRef[] = [
  {
    key: 1,
    tenantId: "a1",
    tenantName: "Eat Cute Cotton Candy Art",
    routeOrder: 10,
  },
  {
    key: 2,
    tenantId: "a2",
    tenantName: "Steepologie",
    routeOrder: 20,
  },
  {
    key: 3,
    tenantId: "a3",
    tenantName: "Purple",
    routeOrder: 30,
  },
]

mockViewModel = {
  handle: 1,
  routeTenants: mockRouteTenants,
  saveTenantRouteOrder: jest.fn(),
}

mockUseQuery.addResponse({
  matcher: CacheKeys.VENUE_ZONE_LOCATIONS,
  responseData: [],
})
mockUseQuery.addResponse({
  matcher: CacheKeys.VENUE_TENANTS_LIST,
  responseData: mockTenantList,
})

describe("<TenantRouteOrderScreen.index />", () => {
  beforeEach(() => {
    // @ts-ignore
    mockProps = {
      navigation: {
        addListener: jest.fn(),
      },
      route: {
        params: {
          routeTenants: mockRouteTenants,
          saveTenantRouteOrder,
        },
      },
    } as ScreenProps
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it("matches snapshot", () => {
    const { toJSON } = renderView(mockProps)
    const tree = toJSON()
    expect(tree).toMatchSnapshot()
  })
})
