# Технические правила работы с репозиторием Sunlight

## Архитектура проекта

Это монорепозиторий для приложения моделирования оптических систем с солнечным светом.

### Структура монорепозитория

```
sunlight/
├── apps/
│   └── client/          # React приложение (фронтенд)
└── packages/
    └── optics-core/     # Библиотека оптических расчетов
```

## Технологический стек

### Общее

- **Package Manager**: `pnpm@9.14.2` (строго)
- **Node.js**: >= 18
- **Build System**: Turborepo 2.3.0
- **TypeScript**: 5.3.3

### apps/client

- **Framework**: React 18.2.0
- **Build Tool**: Vite 5.0.11
- **UI Library**: Material-UI (MUI) 5.15.4
- **3D Visualization**: Three.js 0.160.0 + React Three Fiber + Drei
- **Charts**: Recharts 2.10.3
- **Styling**: Emotion (CSS-in-JS)

### packages/optics-core

- **Build Tool**: tsup 8.0.1 (сборка CJS + ESM + типы)
- **Testing**: Jest 29.7.0 + ts-jest
- **Export Formats**: CommonJS, ES Modules, TypeScript типы

## Правила разработки

### Менеджер пакетов

**ВАЖНО**: Использовать только `pnpm`. Не использовать `npm` или `yarn`.

```bash
pnpm install
pnpm add <package>
pnpm add -w <package>           # установка в root
pnpm add <package> --filter @sunlight/client
pnpm add <package> --filter @sunlight/optics-core
```

### Команды разработки

#### Корневой уровень (через Turbo)

```bash
pnpm dev        # запуск dev-режима всех приложений
pnpm build      # сборка всех пакетов и приложений
pnpm lint       # линтинг всех пакетов
pnpm test       # запуск тестов всех пакетов
pnpm clean      # очистка node_modules и dist
```

#### Client (apps/client)

```bash
cd apps/client
pnpm dev         # запуск dev-сервера Vite (обычно :5173)
pnpm build       # production сборка
pnpm typecheck   # проверка типов без сборки
pnpm preview     # предпросмотр production сборки
pnpm lint        # ESLint с нулевым порогом предупреждений
```

#### Optics-Core (packages/optics-core)

```bash
cd packages/optics-core
pnpm dev         # watch-режим сборки библиотеки
pnpm build       # сборка библиотеки (CJS + ESM + .d.ts)
pnpm test        # запуск Jest тестов
pnpm test:watch  # Jest в watch-режиме
pnpm clean       # удаление dist/
```

### Порядок работы

1. **Установка зависимостей**: `pnpm install` в корне проекта
2. **Разработка**:
   - Для изменений в `optics-core`: сначала `pnpm dev` в `packages/optics-core`
   - Для фронтенда: `pnpm dev` в `apps/client`
   - Или из корня: `pnpm dev` (запустит оба)

3. **Добавление зависимостей**:
   - В конкретный пакет: `pnpm add <package> --filter <workspace-name>`
   - В root: `pnpm add -w <package>`

4. **Перед коммитом**:
   ```bash
   pnpm build      # проверка сборки
   pnpm lint       # проверка линтера
   pnpm test       # запуск тестов
   ```

### Workspace Dependencies

Пакет `@sunlight/optics-core` используется в `@sunlight/client` через workspace protocol:

```json
"@sunlight/optics-core": "workspace:*"
```

При изменениях в `optics-core`:
1. Внести изменения в `packages/optics-core/src/`
2. Запустить `pnpm build` или `pnpm dev` в optics-core
3. Изменения автоматически отразятся в client

### TypeScript

- Используется строгий режим TypeScript
- Настройки в `tsconfig.json` каждого пакета
- Проверка типов: `pnpm typecheck` (в client)
- Сборка с генерацией `.d.ts` файлов в optics-core

### ESLint

- Настроен в `apps/client/eslint.config.js`
- Правило: максимум 0 предупреждений (`--max-warnings 0`)
- Используется flat config формат ESLint 9
- Плагины: TypeScript, React Hooks, React Refresh

### Тестирование

- Jest для `optics-core`
- Тесты в `packages/optics-core/src/*.test.ts`
- Конфигурация: `jest.config.js` с ts-jest

### Docker

- Основной Dockerfile в корне
- Пример: `Dockerfile.example`
- Nginx конфиг: `apps/client/nginx.conf`

## Правила кода

### Общие

- Не писать комментарии в коде
- Использовать TypeScript для всего кода
- Следовать существующему стилю кодирования
- Экспортировать типы из отдельного файла `types.ts`

### React (apps/client)

- Функциональные компоненты с хуками
- Именованные экспорты в `index.ts` для компонентов и хуков
- Компоненты в `src/components/`
- Хуки в `src/hooks/`
- Типизировать пропсы компонентов

### optics-core (packages/optics-core)

- Чистые функции для математических расчетов
- Покрывать код тестами
- Экспортировать публичное API через `src/index.ts`
- Типы в `src/types.ts`

## Структура экспортов

### optics-core

```typescript
// packages/optics-core/src/index.ts
export * from './optics';
export * from './types';
```

### client

```typescript
// apps/client/src/components/index.ts
export { Component1 } from './Component1';
export { Component2 } from './Component2';
```

## Turbo Pipeline

Turborepo управляет зависимостями между задачами:

- `build`: зависит от `^build` (сборка зависимостей сначала)
- `lint`: зависит от `^build` 
- `test`: зависит от `^build`
- `dev`: без кэша, persistent
- `clean`: без кэша

## Troubleshooting

### Проблемы с зависимостями

```bash
pnpm clean          # очистить всё
pnpm install        # переустановить
```

### Проблемы с типами в workspace

```bash
cd packages/optics-core
pnpm build          # пересобрать типы
```

### Проблемы с Turbo кэшем

```bash
pnpm turbo clean
```

## Дополнительная информация

- Лицензия: см. LICENSE
- Engines: Node.js >= 18
- Package Manager: pnpm 9.14.2 (enforced)

