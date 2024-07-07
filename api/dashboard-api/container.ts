import { ContainerModule, interfaces } from 'inversify';
import * as Services from './service';

export const module = new ContainerModule((bind: interfaces.Bind) => {
  bind(Services.DashboardService.TYPE_KEY).to(Services.DashboardService);
});
