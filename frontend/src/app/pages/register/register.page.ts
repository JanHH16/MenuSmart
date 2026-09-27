import { Component } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, ValidationErrors, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-register',
  templateUrl: './register.page.html',
  styleUrls: ['./register.page.scss'],
  standalone: false,
})
export class RegisterPage {
  form: FormGroup;
  errorMessage: string | null = null;
  loading = false;

  constructor(
    private readonly fb: FormBuilder,
    private readonly authService: AuthService,
    private readonly router: Router,
  ) {
    this.form = this.fb.group(
      {
        name: ['', [Validators.required, Validators.minLength(2)]],
        email: ['', [Validators.required, Validators.email]],
        password: ['', [Validators.required, Validators.minLength(6)]],
        confirmarContrasena: ['', [Validators.required]],
      },
      { validators: RegisterPage.passwordsCoincidenValidator },
    );
  }

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
