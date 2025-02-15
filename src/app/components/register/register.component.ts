import { Component } from '@angular/core';
import { SupabaseService } from '../../services/supabase.service';
import { AbstractControl, FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-register',
  imports: [ReactiveFormsModule, CommonModule, FormsModule],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css']
})
export class RegisterComponent {
  registerForm: FormGroup;

  constructor(private supaService: SupabaseService, private formBuilder: FormBuilder, private router: Router) {
    this.registerForm = this.formBuilder.group({
      email: ['', [Validators.required, Validators.pattern('.*@.*')]],
      passwords: this.formBuilder.group({
        password: ['', [Validators.required, Validators.minLength(8), Validators.pattern('.*[0-9].*')]],
        password2: ['', [Validators.required, Validators.minLength(8), Validators.pattern('.*[0-9].*')]],
      }, {
        validators: this.passwordCrossValidator
      })
    });
  }

  get password1NotValid() {
    const control = this.registerForm.get('passwords.password');
    return control?.invalid && control?.touched;
  }

  get password2NotValid() {
    const control = this.registerForm.get('passwords.password2');
    return control?.invalid && control?.touched;
  }

  get passwordValid() {
    return this.registerForm.get('passwords.password')?.valid && this.registerForm.get('passwords.password2')?.valid;
  }

  get crossPasswordsNotValid() {
    return this.registerForm.get('passwords')?.invalid && this.registerForm.get('passwords')?.touched;
  }

  get emailNotValid() {
    const control = this.registerForm.get('email');
    return control?.invalid && control?.touched;
  }

  get emailValid() {
    const control = this.registerForm.get('email');
    return control?.valid && control?.touched;
  }

  passwordValidator(minlength: number): ValidatorFn {
    return (c: AbstractControl): ValidationErrors | null => {
      if (c.value) {
        return c.value.length >= minlength ? null : { password: 'no valida' };
      }
      return null;
    };
  }

  passwordCrossValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
    const ps = control.get('password');
    const ps2 = control.get('password2');
    return ps && ps2 && ps.value === ps2.value ? null : { passwordCrossValidator: true };
  };

  sendRegister() {
    if (this.registerForm.valid) {
      const email = this.registerForm.get('email')?.value;
      const password = this.registerForm.get('passwords.password')?.value;
      this.supaService.registerUser(email, password).subscribe({
        next: logindata => console.log(logindata),
        complete: () => {
          console.log("complete");
          this.router.navigate(['/home']); 
        },
        error: error => this.error = error.message
      });
    } else {
      this.registerForm.markAllAsTouched();
    }
  }

  email: string = '';
  password: string = '';
  error: string | undefined;
}
