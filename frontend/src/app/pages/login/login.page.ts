import { Component, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { LayoutService } from '../../core/services/layout.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: false,
})
export class LoginPage {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly layoutService = inject(LayoutService);

  readonly esDesktop$ = this.layoutService.esDesktop$;

  form: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });
  errorMessage: string | null = null;
  loading = false;

  submit(): void {
    if (this.form.invalid) {
      return;
    }
    this.loading = true;
    this.errorMessage = null;

    this.authService.login(this.form.value).subscribe({
      next: () => {
        this.loading = false;
        this.router.navigateByUrl('/tabs/plan-semanal');
      },
      error: (error: HttpErrorResponse) => {
        this.loading = false;
        // status 0 (sin conexión/CORS) o 5xx (error del servidor) no son
        // culpa del usuario; solo un 4xx significa que el email/contraseña
        // están mal.
        this.errorMessage =
          error.status === 0 || error.status >= 500
            ? 'no pudimos conectar con el servidor, intenta más tarde'
            : 'ups, credenciales incorrectas';
      },
    });
  }
}