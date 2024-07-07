import { mockTenantList } from "@mocks/_mock.deliveryTaskList"
import { _getRouteTenants } from "../useViewModel.private"

const cluster = mockTenantList.list[0].tenantClustering

describe("TenantRouteOrderScreen.useViewModel.private", () => {
  it("should return tenant route list and default route order if missing", () => {
    expect.assertions(3)
    const result = _getRouteTenants(mockTenantList.list, cluster!)
    const clusterTotal = mockTenantList.list.filter(
      (tenant) => JSON.stringify(tenant.tenantClustering) === JSON.stringify(cluster),
    ).length

    expect(result.length).toEqual(clusterTotal)
    expect(result[0].routeOrder).toBe(0)
    expect(Object.keys(result[0])).toEqual(["key", "tenantId", "tenantName", "routeOrder"])
  })
})
