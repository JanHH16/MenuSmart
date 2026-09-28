import { Component, inject } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, ValidationErrors, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { LayoutService } from '../../core/services/layout.service';

@Component({
  selector: 'app-register',
  templateUrl: './register.page.html',
  styleUrls: ['./register.page.scss'],
  standalone: false,
})
export class RegisterPage {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly layoutService = inject(LayoutService);

  readonly esDesktop$ = this.layoutService.esDesktop$;

  form: FormGroup = this.fb.group(
    {
      name: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmarContrasena: ['', [Validators.required]],
    },
    { validators: RegisterPage.passwordsCoincidenValidator },
  );
  errorMessage: string | null = null;
  loading = false;

  private static passwordsCoincidenValidator(group: AbstractControl): ValidationErrors | null {
    const password = group.get('password')?.value;
    const confirmar = group.get('confirmarContrasena')?.value;
    return password === confirmar ? null : { passwordsNoCoinciden: true };
  }

  submit(): void {
    if (this.form.invalid) {
      return;
    }
    this.loading = true;
    this.errorMessage = null;

    // El backend no conoce "confirmarContrasena" (DTO con forbidNonWhitelisted:
    // true), así que solo se usa para validar en el frontend, nunca se envía.
    const { name, email, password } = this.form.value;

    this.authService.register({ name, email, password }).subscribe({
      next: () => {
        this.loading = false;
        this.router.navigateByUrl('/tabs/plan-semanal');
      },
      error: () => {
        this.loading = false;
        this.errorMessage = 'No se pudo crear la cuenta. Verifica los datos.';
      },
    });
  }
}