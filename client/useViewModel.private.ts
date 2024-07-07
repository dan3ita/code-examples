import { TenantInstance } from "@services/tenant"
import { RouteOrderRef } from "./useViewModel"

// Determine the tenants based on the selected tenant's lowest cluster
export const _getRouteTenants = (
  tenants: TenantInstance[],
  selectedCluster: { [p: string]: string },
): RouteOrderRef[] => {
  const rt: RouteOrderRef[] = []

  // cycle through tenant list to determine
  // what other tenants match the selected tenant's cluster level
  tenants.forEach((tenant) => {
    if (tenant.tenantClustering) {
      if (JSON.stringify(tenant.tenantClustering) === JSON.stringify(selectedCluster)) {
        const tenantRoute = {
          key: 0,
          tenantId: tenant.id,
          tenantName: tenant.name,
          routeOrder: tenant.routeOrder || 0,
        }
        rt.push(tenantRoute)
      }
    }
  })

  // sort by route order and set routeTenants
  rt.forEach((r, idx) => (r.key = idx + 1))
  rt.sort((a, b) => (Number(a?.routeOrder) > Number(b?.routeOrder) ? 1 : -1))
  return rt
}
