import { Injectable } from '@angular/core';
import { Observable, Observer, Subscription, filter, share } from 'rxjs';

export class EventWithContent<T> {
  constructor(
    public name: string,
    public content: T,
  ) {}
}

@Injectable({
  providedIn: 'root',
})
export class EventManager {
  observable: Observable<EventWithContent<unknown> | string>;
  observer?: Observer<EventWithContent<unknown> | string>;

  constructor() {
    this.observable = new Observable((observer: Observer<EventWithContent<unknown> | string>) => {
      this.observer = observer;
    }).pipe(share());
  }

  broadcast(event: EventWithContent<unknown> | string): void {
    if (this.observer) {
      this.observer.next(event);
    }
  }

  subscribe(eventNames: string | string[], callback: (event: EventWithContent<unknown> | string) => void): Subscription {
    if (typeof eventNames === 'string') {
      eventNames = [eventNames];
    }
    return this.observable
      .pipe(filter((event: EventWithContent<unknown> | string) => eventNames.includes(typeof event === 'string' ? event : event.name)))
      .subscribe(callback);
  }

  destroy(subscriber: Subscription): void {
    subscriber.unsubscribe();
  }
}
