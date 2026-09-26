import { Controller, Get } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { catchError, firstValueFrom, of, timeout } from 'rxjs';

interface DependencyStatus {
  status: 'ok' | 'error';
  message?: string;
}

@Controller('health')
export class HealthController {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly httpService: HttpService,
  ) {}

  @Get()
  async check() {
    const [database, pythonService] = await Promise.all([
      this.checkDatabase(),
      this.checkPythonService(),
    ]);

    const status = database.status === 'ok' && pythonService.status === 'ok' ? 'ok' : 'degraded';

    return {
      status,
      service: 'menusmart-backend',
      timestamp: new Date().toISOString(),
      dependencies: { database, pythonService },
    };
  }

  private async checkDatabase(): Promise<DependencyStatus> {
    try {
      await this.dataSource.query('SELECT 1');
      return { status: 'ok' };
    } catch (error) {
      return { status: 'error', message: (error as Error).message };
    }
  }

  private async checkPythonService(): Promise<DependencyStatus> {
    const request$ = this.httpService.get('/health').pipe(
      timeout(2000),
      catchError(() => of(null)),
    );
    const response = await firstValueFrom(request$);
    if (!response) {
      return { status: 'error', message: 'El servicio Python no respondió' };
    }
    return { status: 'ok' };
  }
}
