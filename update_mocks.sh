#!/bin/bash
# Remove NEXT_PUBLIC_USE_MOCKS from lib/env/server.ts
sed -i '/const useMocks/d' lib/env/server.ts
sed -i '/if (useMocks) return/d' lib/env/server.ts
