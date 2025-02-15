import { AfterViewInit, Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { SupabaseService } from '../../services/supabase.service';
import { FormBuilder, FormGroup, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { SearchServiceService } from '../../services/search-service.service';
import { debounceTime, distinctUntilChanged, fromEvent, map } from 'rxjs';
import { User } from '@supabase/supabase-js';

@Component({
  selector: 'app-header',
  imports: [RouterLink, RouterLinkActive, ReactiveFormsModule, CommonModule],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css'
})
export class HeaderComponent implements OnInit, AfterViewInit {
  logged: boolean = false;
  user: User | null = null;

  searchForm: FormGroup;

  @ViewChild("searchInput") inputSearch?: ElementRef;

  constructor(
    private supaService: SupabaseService,
    private fb: FormBuilder,
    private search:SearchServiceService
  ) {
    this.searchForm = this.fb.group({
      searchInput: new FormControl('', Validators.required) 
    });
  }

  ngAfterViewInit(): void {
    fromEvent<any>(this.inputSearch?.nativeElement, 'keyup')
      .pipe(
        map(event => event.target.value),
        debounceTime(400),
        distinctUntilChanged()
      )
      .subscribe(text => this.search.emitText(text));
  }

  ngOnInit(): void {
    this.supaService.loggedSubject.subscribe(logged => {
      this.logged = logged;
      if (logged) {
        this.supaService.getUserInfo().subscribe(user => {
          this.user = user;
        });
      } else {
        this.user = null;
      }
    });
    this.search.textObservable.subscribe()
    this.supaService.isLogged();
  }

  logout() {
    this.supaService.logout().subscribe();
  }

  onSearch() {
    const searchValue = this.searchForm.get('searchInput')?.value;
    console.log('Buscando:', searchValue);
    // Aquí puedes enviar el valor a un servicio o realizar una búsqueda
  }
}
