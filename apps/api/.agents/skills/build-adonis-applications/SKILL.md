---
name: build-adonis-applications
description: Apply this project's Laravel-like Adonis architecture when a backend change introduces behavior, controllers, actions, services, or new abstractions.
---

# Build Adonis applications

Keep the application shaped like its domain and Adonis shaped like Adonis.

- Keep controllers cruddy. Prefer the resource methods `index`, `store`, `show`, `update`, and `destroy`.
- Reify a custom operation as a resource: use `FavoritesController.store`, never `CustomersController.addToFavorites`.
- Put a write use-case or multi-step operation in a focused, verb-led action such as `create-customer.ts`. Controllers validate and delegate.
- Query Lucid directly for ordinary reads. Do not introduce repository layers or `CustomerService`-style CRUD wrappers.
- Add a service only for a durable capability shared by different use-cases, such as a channel or payment gateway. Add a provider only when that capability needs container or lifecycle wiring.
- Prefer the framework's conventions and existing application shape over new base classes, directories, or abstractions.
- Extract from real repetition or policy, not anticipated complexity.
