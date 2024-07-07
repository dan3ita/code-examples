import { module } from '@proton/api/dashboard/container';
import { DashboardService } from '@proton/api/dashboard/service';
import { Container, ContainerModule } from 'inversify';

// tslint:disable:no-unused-expression
describe('Proton.Api.Dashboard', () => {
  describe('Container', () => {
    it('Should export module', async () => {
      expect(ContainerModule).toBeDefined();
    });

    it('should have bound keys', async () => {
      const container = new Container();
      container.load(module);
      expect(container.isBound(DashboardService.TYPE_KEY)).toBe(true);
    });
  });
});
