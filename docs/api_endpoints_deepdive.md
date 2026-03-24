# APIs and Endpoints — Bridging the Old World and the New

A guide for developers coming from C/Java/C++ who need to build a mental model for web APIs and endpoints.

---

## Part 1: The API You Already Know

In C, Java, or C++, an API is a collection of function signatures. You've lived in this world:

```c
// C — a library API
int connect(const char* host, int port);
int send(int socket, const char* data, size_t len);
int recv(int socket, char* buffer, size_t len);
void disconnect(int socket);
```

```java
// Java — a class API
public interface ProductRepository {
    Product findById(String id);
    Product findBySlug(String slug);
    List<Product> search(String query, int page, int pageSize);
    Product save(Product product);
    void delete(String id);
}
```

You know exactly what this means:
- **Function name** tells you what it does
- **Parameters** tell you what it needs
- **Return type** tells you what you get back
- **The caller and the callee are in the same process** — same machine, same memory space

When you call `productRepository.findBySlug("cool-hat")`, your code jumps to that function, executes it, and returns the result. It happens in nanoseconds. The data doesn't leave your machine. If the function signature changes, the compiler tells you immediately.

This is **in-process API** — caller and callee share the same runtime.

Hold onto this mental model. Everything below is the same concept, stretched across a network.

---

## Part 2: What Changed — and Why

### The fundamental shift

In the old world, your entire application ran as one program:

```
[Your Code] → calls → [Library Function] → returns → [Your Code]
     |                       |
     +--- same process ------+
     +--- same machine ------+
     +--- same language ------+
     +--- nanoseconds --------+
```

In the web world, applications are split across machines:

```
[Browser/Frontend]  → network →  [Server/Backend]  → network →  [Printify's Server]
     |                                  |                              |
     different machine                  different machine              different machine
     JavaScript                         TypeScript                     unknown language
     milliseconds                       milliseconds                   milliseconds
```

**The function call had to become a network request** because the caller and callee are no longer in the same process. They might not even be in the same country.

But the *concept* is identical:
- You still need to say **which function** you're calling
- You still need to **pass parameters**
- You still need to **get a result back**
- You still need to **handle errors**

The mechanics changed. The idea didn't.

### Why this happened

Three forces drove the shift:

1. **The browser can't link to your library.** A shopper's browser runs JavaScript. Your product database runs on a server. The browser can't call `productRepository.findBySlug()` — there's no shared memory, no shared language, no shared process. The only way to communicate is over the network.

2. **Third-party services are separate companies.** Printify runs on their own servers. You can't `#include <printify.h>` and call their functions. The only interface they expose is over HTTP.

3. **Scale and deployment.** Even within your own system, you might split things across machines for reliability or performance. The pieces need a way to talk to each other across the network.

---

## Part 3: The Translation Table

Here's the direct mapping between the concepts you know and the web API world:

| Old World (C/Java/C++) | New World (Web APIs) | They're the same because... |
|---|---|---|
| Function name | HTTP method + URL path | Both identify *which operation* to perform |
| Parameters | URL params, query string, request body | Both provide *input data* to the operation |
| Return type | Response body (JSON) | Both define *what you get back* |
| Return value | HTTP response | Both carry *the actual data* |
| Exception / error code | HTTP status code + error body | Both signal *what went wrong* |
| Header file / interface | API documentation / OpenAPI spec | Both describe *the contract* without implementation |
| Linking / importing | Base URL (e.g., `https://api.example.com`) | Both establish *where to find* the implementation |
| Calling convention (cdecl, stdcall) | HTTP protocol (GET, POST, PUT, DELETE) | Both define *the rules* for how calls are made |
| Type safety (compiler checks) | Nothing (or runtime validation) | This is the **big loss** in the web world |

Let's unpack each of these.

---

## Part 4: The Mapping in Detail

### Function name → HTTP method + URL path

In Java:
```java
Product findBySlug(String slug);
```

As a web endpoint:
```
GET /api/products/cool-hat
```

The **method** (`GET`) is like a verb category:
- `GET` = read data (like a function that returns something without changing state)
- `POST` = create data or trigger an action (like a function with side effects)
- `PUT` = replace/update data
- `DELETE` = remove data

The **path** (`/api/products/cool-hat`) is the function name + some parameters baked in.

So `GET /api/products/cool-hat` translates to: "Call the read-product function, passing 'cool-hat' as the identifier."

Think of the URL as a **function selector**. The HTTP method narrows the category of operation. Together they uniquely identify what you want to do.

Here's our storefront's API, shown both ways:

```java
// Java-style interface
public interface StorefrontAPI {
    List<Product> listProducts(int page, int pageSize);
    Product getProduct(String slug);
    List<Product> searchProducts(String query);
    Cart getCart(String sessionId);
    Cart addToCart(String sessionId, String productId, String variantId, int quantity);
    Cart updateCartItem(String sessionId, String itemId, int quantity);
    void removeFromCart(String sessionId, String itemId);
}
```

```
// Web API endpoints — same operations
GET    /api/products?page=1&pageSize=20
GET    /api/products/cool-hat
GET    /api/search?q=summer+hats
GET    /api/cart
POST   /api/cart/items                    { productId, variantId, quantity }
PUT    /api/cart/items/item_123           { quantity: 3 }
DELETE /api/cart/items/item_123
```

Same operations. Different encoding.

### Parameters → URL parts, query strings, and request body

In C/Java/C++, parameters are positional or named arguments inside parentheses:

```java
List<Product> search(String query, int page, int pageSize);
// Called as:
search("summer hats", 1, 20);
```

In web APIs, parameters are spread across three places:

**1. Path parameters** — baked into the URL:
```
GET /api/products/cool-hat
                  ^^^^^^^^
                  This is like the first argument: getProduct("cool-hat")
```

**2. Query parameters** — appended after `?`:
```
GET /api/search?q=summer+hats&page=1&pageSize=20
                ^^^^^^^^^^^^^  ^^^^^^ ^^^^^^^^^^^
                arg 1          arg 2  arg 3
```

**3. Request body** — JSON payload in POST/PUT requests:
```
POST /api/cart/items
Content-Type: application/json

{
  "productId": "prod_123",
  "variantId": "var_456",
  "quantity": 2
}
```

This is like calling:
```java
addToCart("prod_123", "var_456", 2);
```

Why three places? Convention and semantics:
- **Path params** identify *which resource* (like a primary key)
- **Query params** modify *how* to retrieve it (filtering, pagination, sorting)
- **Body** carries *data to write* (new records, updates)

It's like if C had a convention where the first argument was always the object pointer, the second was always flags, and the rest were data. Arbitrary, but consistent.

### Return type → JSON response

In Java:
```java
Product findBySlug(String slug);
// Returns a Product object with fields: id, title, price, etc.
```

Web API response:
```json
{
  "data": {
    "id": "prod_123",
    "slug": "cool-hat",
    "title": "Cool Summer Hat",
    "description": "A very cool hat for summer.",
    "basePrice": 29.99,
    "currency": "USD",
    "variants": [
      {
        "id": "var_456",
        "title": "Blue / Large",
        "sku": "HAT-BLU-L",
        "price": 29.99,
        "inStock": true
      }
    ]
  }
}
```

In the old world, the compiler enforces the return type — if `findBySlug` returns a `Product`, you know exactly what fields are available, and the compiler catches mistakes.

In the web world, you get a blob of JSON. Your code has to **trust** that the fields are there, or validate them at runtime. This is the biggest ergonomic loss compared to in-process APIs.

TypeScript partially recovers this:

```typescript
// You can define the expected shape
interface Product {
  id: string
  slug: string
  title: string
  basePrice: number
  currency: string
  variants: ProductVariant[]
}

// And type the response
const response = await fetch('/api/products/cool-hat')
const { data } = await response.json() as { data: Product }

// Now your IDE knows data.title is a string
console.log(data.title)  // autocomplete works
```

But this is **voluntary** type annotation, not compiler-enforced. The server could send anything. The TypeScript types are a promise, not a guarantee.

### Exceptions → HTTP status codes

In Java:
```java
try {
    Product p = repository.findBySlug("nonexistent");
} catch (NotFoundException e) {
    // handle missing product
} catch (DatabaseException e) {
    // handle database failure
}
```

In web APIs, errors are encoded as HTTP status codes:

```
200 OK              — Success. Here's your data.      (like: return result;)
201 Created         — Successfully created.             (like: return newObject;)
400 Bad Request     — Your parameters are wrong.        (like: IllegalArgumentException)
401 Unauthorized    — Invalid credentials/signature.    (like: SecurityException)
404 Not Found       — That resource doesn't exist.      (like: NotFoundException)
409 Conflict        — Operation conflicts with state.   (like: ConcurrentModificationException)
422 Unprocessable   — Data is well-formed but invalid.  (like: ValidationException)
500 Internal Error  — Server crashed.                   (like: RuntimeException / segfault)
503 Service Unavail — Server is overloaded/down.        (like: no equivalent — your process is dead)
```

The response body often includes details:

```json
{
  "error": {
    "code": "PRODUCT_NOT_FOUND",
    "message": "No product with slug 'nonexistent'"
  }
}
```

In the old world, exceptions carry stack traces, typed error objects, and can be caught by type. In the web world, you get a number and a JSON blob. Less precise, but it crosses network boundaries — which exceptions can't.

### Header files → API documentation

In C:
```c
// printify.h — this IS the API contract
int pfy_create_order(const char* product_id, int quantity);
int pfy_get_order_status(const char* order_id, char* status_buf, size_t buf_len);
void pfy_cancel_order(const char* order_id);
```

You `#include` this file and the compiler enforces it. If Printify changes a function signature, your code won't compile.

In the web world, the equivalent is **API documentation** — a webpage or document that describes the endpoints:

```
POST /v1/orders
  Body: { "product_id": "string", "quantity": "integer" }
  Returns: { "order_id": "string", "status": "string" }
  Errors: 400 (invalid input), 401 (bad API key)

GET /v1/orders/{order_id}
  Returns: { "order_id": "string", "status": "string", "tracking": {...} }
  Errors: 404 (not found)

DELETE /v1/orders/{order_id}
  Returns: 204 No Content
  Errors: 404 (not found), 409 (already shipped)
```

The critical difference: **there's no compiler.** If Printify changes their API, your code still compiles. It just breaks at runtime when the response doesn't match what you expected. You find out in production, not at build time.

This is why API versioning exists (`/v1/orders`). It's the web equivalent of maintaining backward compatibility in a shared library.

**OpenAPI** (formerly Swagger) tries to formalize this by providing a machine-readable spec — essentially a header file for web APIs. But unlike C headers, using it is optional and many APIs don't provide one.

### Linking → Base URL

In C:
```
gcc myapp.c -lprintify    # Link against libprintify
```

In the web world:
```typescript
const PRINTIFY_BASE_URL = 'https://api.printify.com/v1'

// Every call goes through this base URL
fetch(`${PRINTIFY_BASE_URL}/orders`)
fetch(`${PRINTIFY_BASE_URL}/orders/${orderId}`)
```

The base URL is like the library you link against — it tells your code where to find the implementation. Different environments might use different base URLs:

```
Development:  http://localhost:3000/api
Staging:      https://staging.my-store.vercel.app/api
Production:   https://my-store.vercel.app/api
```

Like how you might link against a debug vs. release build of a library.

---

## Part 5: What You Lose Crossing the Network

The shift from in-process to over-the-network introduces fundamental problems that don't exist in the old world:

### 1. Latency

```
Old world:  function call → return     ~nanoseconds
New world:  HTTP request → response    ~50-500 milliseconds
```

That's a **million times slower**. This changes how you design everything:
- You batch operations instead of making many small calls
- You cache aggressively
- You think carefully about how many API calls a page load triggers
- You use loading states in the UI because the user can perceive the delay

In our storefront: loading the home page might need `GET /api/products?featured=true`. That's one network round-trip. If we also needed the cart count, that's a second. In Java, two method calls take nanoseconds. Over HTTP, two sequential calls might take 200ms — noticeable to the user.

### 2. Failure modes that don't exist in-process

In C++, `repository.findBySlug("cool-hat")` either returns a result, throws an exception, or segfaults. It doesn't:
- Take 30 seconds and then fail
- Return half a response
- Succeed on the first call and fail on identical second call
- Work from your machine but not from production

Network calls can do all of these. You need:
- **Timeouts** — "If the server doesn't respond in 5 seconds, give up"
- **Retries** — "Try again once on failure"
- **Circuit breakers** — "If 10 calls in a row fail, stop trying for 30 seconds"
- **Graceful degradation** — "If the product API is down, show cached data"

None of these concepts exist when calling a function in the same process.

### 3. No type safety across the boundary

In Java, if `findBySlug` returns `Product`, the compiler guarantees you get a `Product` with all its fields. In the web world:

```typescript
const response = await fetch('/api/products/cool-hat')
const data = await response.json()

// data is type 'any' — could be anything
// data.title might be a string, might be undefined, might be a number
// The server might have changed the field name to 'name'
// You won't know until this code runs
```

This is why TypeScript, Zod (runtime validation), and API contracts matter — they're trying to recover the type safety that C/Java/C++ give you for free within a single process.

### 4. Serialization

In-process, you pass objects by reference or copy. The data stays in its native binary format.

Over the network, everything must be **serialized** (converted to text/bytes) and **deserialized** (converted back):

```
Your code:    Product { id: "123", price: 29.99, inStock: true }
     ↓ serialize (to JSON string)
Network:      {"id":"123","price":29.99,"inStock":true}
     ↓ deserialize (parse JSON)
Their code:   Product { id: "123", price: 29.99, inStock: true }
```

This adds overhead, introduces edge cases (floating point precision, date formatting, character encoding), and means you can't pass things that don't serialize — functions, file handles, database connections, circular references.

### 5. Versioning is manual

In C, if you change a function signature in a shared library, every program that links against it must recompile. The compiler forces compatibility.

In web APIs, the server can change at any time without telling clients. Version management is entirely manual:

```
/v1/products  — old format, deprecated
/v2/products  — new format, current
```

Or through headers:

```
Accept: application/vnd.mystore.v2+json
```

There's no linker to enforce this. If you forget to update your client code when the API changes, things silently break.

---

## Part 6: Our Storefront's Full API — Both Notations

Here's our entire API, shown as Java interfaces (what you're used to) alongside the web endpoint equivalent:

### Product operations

```java
// Java-style
public interface ProductAPI {
    /**
     * List products with pagination.
     * @param page     Page number (1-based)
     * @param pageSize Items per page (default 20)
     * @return Paginated list of products
     */
    PaginatedList<Product> listProducts(int page, int pageSize);

    /**
     * Get a single product by slug.
     * @param slug URL-friendly product identifier
     * @return Product with variants
     * @throws NotFoundException if slug doesn't match any product
     */
    Product getProduct(String slug);

    /**
     * Search products by text query.
     * @param query  Search text
     * @param page   Page number
     * @return Paginated search results
     */
    PaginatedList<Product> searchProducts(String query, int page);
}
```

```
// Web API equivalent
GET /api/products?page=1&pageSize=20
    → 200: { data: Product[], pagination: { page, pageSize, total } }

GET /api/products/:slug
    → 200: { data: Product }
    → 404: { error: { code: "PRODUCT_NOT_FOUND", message: "..." } }

GET /api/search?q=summer+hats&page=1
    → 200: { data: Product[], pagination: { page, pageSize, total } }
```

### Cart operations

```java
// Java-style
public interface CartAPI {
    /**
     * Get current cart contents.
     * Session ID is implicit (from cookie, like ThreadLocal in Java).
     * @return Cart with items, or empty cart if none exists
     */
    Cart getCart();

    /**
     * Add an item to the cart.
     * @param productId Product to add
     * @param variantId Specific variant (size/color)
     * @param quantity  How many
     * @return Updated cart
     * @throws NotFoundException if product/variant doesn't exist
     * @throws OutOfStockException if variant is unavailable
     */
    Cart addItem(String productId, String variantId, int quantity);

    /**
     * Update quantity of an existing cart item.
     * @param itemId   Cart item to update
     * @param quantity New quantity (0 = remove)
     * @return Updated cart
     * @throws NotFoundException if item not in cart
     */
    Cart updateItem(String itemId, int quantity);

    /**
     * Remove an item from the cart.
     * @param itemId Cart item to remove
     * @throws NotFoundException if item not in cart
     */
    void removeItem(String itemId);
}
```

```
// Web API equivalent
GET    /api/cart
    → 200: { data: Cart }
    Session ID comes from cookie header (like ThreadLocal — implicit context)

POST   /api/cart/items
    Body: { productId: "prod_123", variantId: "var_456", quantity: 2 }
    → 201: { data: Cart }
    → 404: { error: { code: "PRODUCT_NOT_FOUND", message: "..." } }
    → 409: { error: { code: "OUT_OF_STOCK", message: "..." } }

PUT    /api/cart/items/:itemId
    Body: { quantity: 3 }
    → 200: { data: Cart }
    → 404: { error: { code: "ITEM_NOT_FOUND", message: "..." } }

DELETE /api/cart/items/:itemId
    → 200: { data: Cart }
    → 404: { error: { code: "ITEM_NOT_FOUND", message: "..." } }
```

### Webhook operations (server-to-server)

```java
// Java-style — if Printify called your code directly
public interface WebhookReceiver {
    /**
     * Receive a webhook event from Printify.
     * @param signature HMAC-SHA256 signature for verification
     * @param eventType Type of event (e.g., "order.shipped")
     * @param payload   Raw event data
     * @throws SecurityException if signature is invalid
     */
    void receiveEvent(String signature, String eventType, String payload);
}

// And if you called Printify's code directly
public interface SyncAPI {
    /**
     * Manually sync order state from Printify.
     * @param targetType What to sync ("orders", "products")
     * @return Sync result summary
     */
    SyncResult triggerSync(String targetType);
}
```

```
// Web API equivalent
POST /api/webhooks/printify
    Headers:
      X-Printify-Signature: sha256=abc123...
      X-Printify-Event: order.shipped
    Body: { event: "order.shipped", data: { order_id: "...", ... } }
    → 200: "OK"
    → 401: "Invalid signature"

POST /api/sync/printify
    Body: { targetType: "orders" }
    → 200: { data: { synced: 5, failed: 0, duration: "1.2s" } }
    → 500: { error: { code: "SYNC_FAILED", message: "Printify API unreachable" } }
```

### The pattern

Notice how every Java method maps to a web endpoint:

```
[return type]  [method name]([params])          →  [HTTP method] [path]?[query] + [body]
Product        getProduct(String slug)          →  GET /api/products/:slug
Cart           addItem(String pid, int qty)     →  POST /api/cart/items { pid, qty }
void           removeItem(String itemId)        →  DELETE /api/cart/items/:itemId
```

The web version is more verbose, but it's the same operation expressed in a different protocol.

---

## Part 7: How Web API Calls Actually Work in Code

Here's what calling a web API looks like in practice, compared to calling a Java method:

### Calling a Java API

```java
// Simple, direct, type-safe
ProductRepository repo = new ProductRepositoryImpl(database);
Product hat = repo.findBySlug("cool-hat");
System.out.println(hat.getTitle());   // "Cool Summer Hat"
System.out.println(hat.getPrice());   // 29.99
```

### Calling a web API from JavaScript (raw)

```typescript
// Verbose, async, no type safety by default
const response = await fetch('https://my-store.vercel.app/api/products/cool-hat')

// Check for errors (no exceptions — you check the status code)
if (!response.ok) {
  if (response.status === 404) {
    throw new Error('Product not found')
  }
  throw new Error(`API error: ${response.status}`)
}

// Deserialize the response
const json = await response.json()
const product = json.data

// Use the data (no compiler help — you're trusting the field names)
console.log(product.title)       // "Cool Summer Hat"
console.log(product.basePrice)   // 29.99
```

### Calling a web API with a typed client (recovering type safety)

Many teams build a thin **API client** — essentially a wrapper that makes web calls feel like function calls again:

```typescript
// api-client.ts — a wrapper that resembles the old world
class StorefrontClient {
  private baseUrl: string

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl
  }

  async getProduct(slug: string): Promise<Product> {
    const res = await fetch(`${this.baseUrl}/api/products/${slug}`)
    if (!res.ok) {
      if (res.status === 404) throw new ProductNotFoundError(slug)
      throw new ApiError(res.status, await res.text())
    }
    const json = await res.json()
    return json.data as Product
  }

  async searchProducts(query: string, page = 1): Promise<PaginatedList<Product>> {
    const params = new URLSearchParams({ q: query, page: String(page) })
    const res = await fetch(`${this.baseUrl}/api/search?${params}`)
    if (!res.ok) throw new ApiError(res.status, await res.text())
    return await res.json()
  }

  async addToCart(productId: string, variantId: string, quantity: number): Promise<Cart> {
    const res = await fetch(`${this.baseUrl}/api/cart/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId, variantId, quantity })
    })
    if (!res.ok) throw new ApiError(res.status, await res.text())
    const json = await res.json()
    return json.data as Cart
  }
}
```

Now the calling code looks familiar:

```typescript
const client = new StorefrontClient('https://my-store.vercel.app')

const hat = await client.getProduct('cool-hat')       // Looks like Java!
console.log(hat.title)                                  // Type-checked by TypeScript

const cart = await client.addToCart(hat.id, hat.variants[0].id, 1)
console.log(cart.items.length)                          // 1
```

This is the pattern: **web APIs are function calls over HTTP, and good client libraries hide the HTTP so you can think in terms of functions again.**

---

## Part 8: The Server Side — Implementing Endpoints

In the old world, you implement an interface:

```java
public class ProductRepositoryImpl implements ProductRepository {
    @Override
    public Product findBySlug(String slug) {
        return database.query("SELECT * FROM products WHERE slug = ?", slug);
    }
}
```

In Next.js (our framework), you implement a **route handler** — a file whose path matches the URL:

```
File: app/api/products/[slug]/route.ts
URL:  GET /api/products/:slug
```

```typescript
// app/api/products/[slug]/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// This function handles GET requests to /api/products/:slug
// It's the web equivalent of "Product findBySlug(String slug)"
export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }    // ← like the method parameter
) {
  // Implementation — same as your Java version
  const product = await db.product.findUnique({
    where: { slug: params.slug },
    include: { variants: true }
  })

  // Error handling — return 404 instead of throwing NotFoundException
  if (!product) {
    return NextResponse.json(
      { error: { code: 'PRODUCT_NOT_FOUND', message: `No product: ${params.slug}` } },
      { status: 404 }
    )
  }

  // Return value — JSON instead of a typed object
  return NextResponse.json({ data: product })
}
```

The mapping:

| Java concept | Next.js route handler concept |
|---|---|
| `class ProductRepositoryImpl` | File `app/api/products/[slug]/route.ts` |
| `implements ProductRepository` | File path determines the URL pattern |
| `public Product findBySlug(String slug)` | `export async function GET(request, { params })` |
| Method parameter `slug` | `params.slug` (extracted from URL) |
| `return product` | `return NextResponse.json({ data: product })` |
| `throw new NotFoundException()` | `return NextResponse.json({ error }, { status: 404 })` |

The function signature is always the same shape (`GET(request, context)`) regardless of what the endpoint does. The differentiation happens through:
- Which file the function lives in (determines the URL)
- Which HTTP method the function is named after (`GET`, `POST`, `PUT`, `DELETE`)
- What you read from `request` and `params`

This feels less explicit than a Java interface, but it's the same pattern — the file system *is* the interface definition.

---

## Part 9: REST — The Convention That Organizes Everything

In C/Java/C++, you have design patterns (Factory, Observer, Repository) that provide conventions for organizing code. In web APIs, the dominant convention is **REST** (Representational State Transfer).

REST is not a technology — it's a naming and organization convention. The core idea:

**Think in nouns (resources), not verbs (actions).**

### Old style (RPC / verb-oriented):

```
POST /api/getProduct         { slug: "cool-hat" }
POST /api/searchProducts     { query: "summer" }
POST /api/addToCart           { productId: "123", quantity: 1 }
POST /api/removeFromCart      { itemId: "456" }
POST /api/getCart             {}
```

Everything is a POST. The action is in the URL. This is how you'd naturally translate Java method calls to URLs — and it works, but it's messy. What does "POST" to "getProduct" mean? You're using a write verb (POST) for a read operation (get).

### REST style (noun-oriented):

```
GET    /api/products/cool-hat
GET    /api/search?q=summer
POST   /api/cart/items          { productId: "123", quantity: 1 }
DELETE /api/cart/items/456
GET    /api/cart
```

Resources are nouns in the URL (`products`, `cart`, `items`). The HTTP method is the verb (`GET` = read, `POST` = create, `DELETE` = remove). It's like a grammar:

```
GET    /api/products          → "Read the products collection"
GET    /api/products/cool-hat → "Read the product called cool-hat"
POST   /api/products          → "Create a new product"
PUT    /api/products/cool-hat → "Update the product called cool-hat"
DELETE /api/products/cool-hat → "Delete the product called cool-hat"
```

**The URL identifies the thing. The HTTP method identifies what you're doing to it.**

For a C/Java developer, think of it as:
- The URL is the **object reference** (`this` pointer / `self`)
- The HTTP method is the **method being called** on that object
- `GET /api/products/cool-hat` ≈ `products["cool-hat"].get()`
- `DELETE /api/cart/items/456` ≈ `cart.items["456"].delete()`

---

## Part 10: What Our Storefront's API Contract Should Look Like

Based on everything above, here's what a lightweight API contract document looks like for our project — the web equivalent of a header file:

### Convention

```
Base URL:     /api
Content-Type: application/json
Auth:         Session cookie (automatic, httpOnly)

Success responses:
  Single item:  { "data": { ... } }
  List:         { "data": [...], "pagination": { "page": N, "pageSize": N, "total": N } }

Error responses:
  { "error": { "code": "MACHINE_READABLE_CODE", "message": "Human-readable description" } }

Status codes:
  200 = success
  201 = created
  400 = bad input (your fault)
  401 = unauthorized (invalid signature/session)
  404 = not found
  500 = server error (our fault)
```

### Endpoints

```
Products
  GET  /api/products?page=1&pageSize=20&featured=true
       → { data: Product[], pagination }

  GET  /api/products/:slug
       → { data: Product }
       → 404 if not found

Search
  GET  /api/search?q=:query&page=1
       → { data: Product[], pagination }
       → Empty data array if no results (NOT a 404)

Cart (session-scoped — the cookie identifies whose cart)
  GET    /api/cart
         → { data: Cart }    (empty cart if none exists)

  POST   /api/cart/items
         Body: { productId, variantId, quantity }
         → 201: { data: Cart }

  PUT    /api/cart/items/:itemId
         Body: { quantity }
         → { data: Cart }

  DELETE /api/cart/items/:itemId
         → { data: Cart }

Webhooks (server-to-server, signature-verified)
  POST /api/webhooks/printify
       Headers: X-Printify-Signature, X-Printify-Event
       Body: provider-defined payload
       → 200 or 401

Sync (internal/admin)
  POST /api/sync/printify
       Body: { targetType: "orders" | "products" }
       → { data: SyncResult }
```

### Data shapes

```typescript
// These are the "struct definitions" — the equivalent of your .h file types

interface Product {
  id: string
  slug: string
  title: string
  description: string
  basePrice: number
  currency: string
  status: string
  featured: boolean
  tags: string[]
  commerceProvider: "native" | "shopify" | "mixed"
  variants: ProductVariant[]
  createdAt: string        // ISO 8601 datetime
  updatedAt: string
}

interface ProductVariant {
  id: string
  title: string
  sku: string
  price: number
  imageUrl: string | null
  inStock: boolean
  optionValues: Record<string, string>   // e.g., { "Color": "Blue", "Size": "L" }
}

interface Cart {
  id: string
  items: CartItem[]
  itemCount: number        // Total quantity across all items
  subtotal: number         // Sum of (item.unitPrice * item.quantity)
  currency: string
}

interface CartItem {
  id: string
  product: Product         // Nested product data (so the cart page doesn't need extra API calls)
  variant: ProductVariant
  quantity: number
  unitPrice: number
}

interface Pagination {
  page: number
  pageSize: number
  total: number
}

interface SyncResult {
  synced: number
  failed: number
  duration: string
  errors: string[]
}

interface ApiError {
  code: string             // Machine-readable: "PRODUCT_NOT_FOUND", "OUT_OF_STOCK"
  message: string          // Human-readable: "No product with slug 'nonexistent'"
}
```

This is your header file. It's written in TypeScript types instead of C structs or Java interfaces, but it serves exactly the same purpose: **define the contract between caller and callee so both sides agree on the shape of data crossing the boundary.**

---

## Part 11: The Mental Model — Tying It All Together

Here's the final mental model to carry with you:

```
OLD WORLD                           NEW WORLD
────────────────────────────────    ────────────────────────────────
Library (.a, .jar, .dll)            Server (https://api.example.com)
Header file (.h) / Interface        API documentation / OpenAPI spec
Function name                       HTTP method + URL path
Parameters                          Path params + query + body
Return type                         JSON response shape
Return value                        HTTP response body
Exception                           HTTP status code + error body
Compiler type checking              Runtime validation (or nothing)
Linking (gcc -lfoo)                 Base URL configuration
Function call (nanoseconds)         HTTP request (milliseconds)
In-process (same memory)            Over network (different machines)
Synchronous (mostly)                Asynchronous (always)
```

**The concept is identical: define a contract, call through it, get results back.**

**The difference is the transport:** memory bus vs. HTTP over the internet. Everything else — the verbosity, the JSON, the status codes, the lack of type safety, the latency, the failure modes — flows from that one change.

When you look at `GET /api/products/cool-hat` and feel disoriented, translate it in your head:

```
GET /api/products/cool-hat
=
productService.getProduct("cool-hat") → Product
```

That's all it is. A function call wearing an HTTP costume.
