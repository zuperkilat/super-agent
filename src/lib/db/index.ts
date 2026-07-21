import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import * as schema from './schema'

const connectionString = process.env.DATABASE_URL

// Handle missing DATABASE_URL gracefully during build
let db: any = null
let pool: any = null

if (connectionString) {
  pool = new Pool({ connectionString })
  db = drizzle(pool, { schema })
} else if (typeof window === 'undefined') {
  // Server-side: Create a dummy db object that won't throw during imports
  db = {
    select: () => ({ from: () => ({ where: () => Promise.resolve([]) }) }),
    insert: () => ({ values: () => Promise.resolve({}) }),
    update: () => ({ set: () => ({ where: () => Promise.resolve({}) }) }),
    delete: () => ({ where: () => Promise.resolve({}) }),
  }
}

export { db, schema }
export { pool }
