import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { AuthError, createClient, SupabaseClient } from '@supabase/supabase-js';
import { User } from '@supabase/supabase-js';
import {
  BehaviorSubject,
  forkJoin,
  from,
  fromEvent,
  interval,
  map,
  mergeMap,
  Observable,
  switchMap,
  take,
  tap,
} from 'rxjs';
import { environment } from '../../environments/environment';
import { IRecipe } from '../recipes/i-recipe';
import { Ingredient } from '../recipes/ingredient';
import { ISharedRecipe } from '../recipes/i-shared-recipe';

@Injectable({
  providedIn: 'root',
})
export class SupabaseService {
  private supabase: SupabaseClient;

  constructor(private http: HttpClient) {
    this.supabase = createClient(
      environment.supabaseUrl,
      environment.supabaseKey
    );
  }
  async createMeal(meal: any): Promise<void> {
    const { error } = await this.supabase.from('meals').insert([meal]);
    if (error) {
      throw error;
    }
  }
  
  async updateMeal(idMeal: string, meal: any): Promise<void> {
    const { error } = await this.supabase.from('meals').update(meal).eq('idMeal', idMeal);
    if (error) {
      throw error;
    }
  }
  
  getDataObservable<T>(
    table: string,
    search?: Object,
    ids?: string[],
    idField?: string
  ): Observable<T[]> {
    return from(this.getData(table, search, ids, idField));
  }

  async getData(
    table: string,
    search?: Object,
    ids?: string[],
    idField?: string
  ): Promise<any[]> {
    let query = this.supabase.from(table).select('*');
    if (search) {
      query = query?.match(search);
    }
    if (ids) {
      console.log(idField);

      query = query?.in(idField ? idField : 'id', ids);
    }
    const { data, error } = await query;
    if (error) {
      console.error('Error fetching data:', error);
      throw error;
    }
    return data;
  }

  getMeals(search?: string): Observable<IRecipe[]> {
    return this.getDataObservable(
      'meals',
      search ? { idMeal: search } : undefined
    );
  }

  getIngredients(ids: (string | null)[]): Observable<Ingredient> {
    return this.getDataObservable<Ingredient>(
      'ingredients',
      undefined,
      ids.filter((id) => id !== null) as string[],
      'idIngredient'
    ).pipe(
      mergeMap((ingredients: Ingredient[]) => from(ingredients)),
      mergeMap(async (ingredient: Ingredient) => {
        const { data, error } = await this.supabase.storage
          .from('recipes')
          .download(`${ingredient.strStorageimg}`);
        if (data) {
          ingredient.blobimg = URL.createObjectURL(data);
        }
        return ingredient;
      })
    );
  }

  login(email: string, password: string) {
    const loginResult = from(
      this.supabase.auth.signInWithPassword({
        email,
        password,
      })
    ).pipe(
      map(({ data, error }) => {
        if (error) {
          throw error;
        }
        return data;
      }),
      tap(() => this.isLogged())
    );

    return loginResult;
  }

  getSharedRecipes(search?: string): Observable<ISharedRecipe[]> {
    return from(
      this.supabase
        .from('shared_recipes')
        .select('*, meals(*),shared_recipes_events(*)')
    ).pipe(map(({ data }) => data as ISharedRecipe[]));
  }

  createSharedRecipesEvents(
    idSharedRecipe: number,
    step: number,
    user: string
  ) {
    return from(
      this.supabase.from('shared_recipes_events').insert([
        {
          shared_recipe: idSharedRecipe,
          step: step,
          user: user,
        },
      ])
    );
  }

  loggedSubject = new BehaviorSubject(false);

  async isLogged() {
    const {
      data: { user },
    } = await this.supabase.auth.getUser();
    if (user) {
      this.loggedSubject.next(true);
    } else this.loggedSubject.next(false);
  }

  getUserInfo(): Observable<User> {
    return from(this.supabase.auth.getUser()).pipe(
      map(({ data }) => data.user as User)
    );
  }

  registerUser(email: string, password: string): Observable<User | null> {
    return from(this.supabase.auth.signUp({ email, password })).pipe(
      map(({ data }) => data.user)
    );
  }

  logout(): Observable<void> {
    return from(this.supabase.auth.signOut()).pipe(
      map(({ error }: { error: AuthError | null }) => {
        if (error) {
          throw error;
        }
      }),
      tap(() => this.loggedSubject.next(false))
    );
  }

  getCharacters(): Observable<any[]> {
    return this.http
      .get<{ results: any[] }>(
        'https://rickandmortyapi.com/api/character/?page=19'
      )
      .pipe(map((data: { results: any[] }) => data.results));
  }

  getInterval(): Observable<number> {
    return interval(1000);
  }

  getPDF(recipe: IRecipe): Observable<string> {
    return from(
      this.supabase.storage.from('recipes').download(`${recipe.pdf}`)
    ).pipe(
      map(({ data, error }) => {
        let blobimg = '';
        if (data) {
          blobimg = URL.createObjectURL(data);
        }
        return blobimg;
      })
    );
  }

  getPDFBase64(recipe: IRecipe): string {
    return `data:application/pdf;base64,${recipe.pdf}`;
  }

  getPDFBase64blob(recipe: IRecipe): string {
    const byteCharacters = atob(recipe.pdf!);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return URL.createObjectURL(
      new Blob([byteArray], { type: recipe.mimepdf! })
    );
  }

  assignPDF(file: File, recipe: IRecipe) {
    const reader = new FileReader();

    fromEvent(reader, 'load')
      .pipe(
        map(() => {
          const base64String = (reader.result as string).split(',')[1]; // Quitar "data:mimeType;base64,"
          const fileData = {
            base64: base64String,
            mimeType: file.type,
          };
          console.log(fileData);
          return fileData;
        }),
        switchMap((fileData) => {
          return from(
            this.supabase
              .from('meals')
              .update({ pdf: fileData.base64, mimepdf: fileData.mimeType })
              .eq('idMeal', recipe.idMeal)
              .select()
          );
        })
      )
      .subscribe();

    reader.readAsDataURL(file);
  }
}
