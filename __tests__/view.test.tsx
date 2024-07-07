import React from "react"
import { fireEvent, render } from "@testing-library/react-native"

import { MockUseQuery, HookState } from "@mocks/_mock.reactQuery"
import { ViewModel } from "../useViewModel"
import ScreenView from "../view"

import { TenantList } from "@hooks/useVenueTenants"
import { CacheKeys } from "@services/api.types"
import mockTenants from "@mocks/_mock.tenants"
import { mockRouteTenants } from "./index.test"
import { act } from "react-test-renderer"

jest.mock("../useViewModel")
jest.mock("react-native-reanimated")
jest.mock("react-native-draggable-flatlist")

let mockViewModel: ViewModel = {} as ViewModel
let mockUseQuery: MockUseQuery
const tenantList = new TenantList(mockTenants)

let renderView = (mockViewModelProps: ViewModel) => {
  const r = render(<ScreenView {...mockViewModelProps} />)
  return { ...r }
}

describe("<TenantRouteOrderScreen View/>", () => {
  beforeEach(() => {
    // suppressing console error: "Warning: DraggableFlatList.getDerivedStateFromProps():
    // A valid state object (or null) must be returned. You have returned undefined."
    // until a solution to mock and render draggable list is found
    jest.spyOn(console, "error").mockImplementation(() => jest.fn())

    mockUseQuery = new MockUseQuery()
    mockUseQuery.addResponse({
      matcher: CacheKeys.VENUE_TENANTS_LIST,
      responseData: tenantList,
      hookState: HookState.SUCCESS,
    })

    mockViewModel = {
      handle: 1,
      routeTenants: mockRouteTenants,
      saveTenantRouteOrder: jest.fn(),
      tenantId: "t1-1",
    }
  })

  it("should render", () => {
    const { getByA11yLabel, toJSON } = renderView(mockViewModel)
    const tree = toJSON()
    expect(tree).toMatchSnapshot()
    expect(getByA11yLabel("saveBtn")).toBeTruthy()
  })

  it("should fire an event to save button press", async () => {
    expect.assertions(1)
    const { getByA11yLabel } = renderView(mockViewModel)
    const saveBtn = getByA11yLabel("saveBtn")
    await act(async () => {
      await fireEvent.press(saveBtn)
    })
    expect(mockViewModel.saveTenantRouteOrder).toHaveBeenCalled()
  })
})
