# Plan Maestro QA · ERP Trazabilidad Logística

Micrositio temporal para planificar y reportar el proceso de validación integral del ERP.

## Periodo calculado

- Inicio: miércoles 19 de agosto de 2026.
- Fin objetivo base: viernes 11 de septiembre de 2026.
- Solo lunes a viernes.
- Zona horaria: America/Bogota.
- Jornada laboral del ERP: 07:00–12:00 y 13:40–17:30.
- Capacidad de proyecto usada para la estimación: 7 horas/día (420 min), dejando 1 h 50 min de holgura diaria para reuniones, soporte, documentación e imprevistos.
- El plan contiene 156 escenarios base y reserva las últimas jornadas para correcciones, re-pruebas y regresión E2E.

## Firebase

El paquete ya está configurado con el Firebase WEB de Trazabilidad Logística recuperado del repositorio EI ERP Nova V6.2 (`trazabilidadlog`).

1. En Firestore, integre `firestore.rules.snippet` dentro de las reglas existentes o use el archivo `firestore.rules.merged` incluido.
2. Publique el sitio en el mismo dominio autorizado o agregue el dominio nuevo a Firebase Authentication > Authorized domains.
3. Inicie sesión con una cuenta activa del ERP para editar y guardar. El modo ejecutivo puede leer el resumen sanitizado sin login una vez publicadas las reglas.

### Base alterna

Por defecto el tracker usa dos colecciones aisladas del ERP operativo:

- `erpQaTracker/erp-launch-2026`: detalle interno y editable.
- `erpQaPublic/erp-launch-2026`: resumen ejecutivo sanitizado.

No escribe en `orders`, `cases`, `users`, inventario ni eventos operativos.

Este enfoque funciona como una base lógica alterna dentro del mismo Firestore y evita tocar las colecciones operativas.

## Compartir con el superior

Use la misma URL agregando:

`?executive=1`

Ese modo oculta edición y muestra únicamente avance, cronograma, riesgos y fecha objetivo.

## Modo local

Si Firebase todavía no está configurado, el HTML funciona en modo local usando `localStorage`. Esto permite revisar diseño y operación, pero el avance no se comparte entre dispositivos hasta conectar Firestore.
