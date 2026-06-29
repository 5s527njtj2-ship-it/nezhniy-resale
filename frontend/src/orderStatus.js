// Единая цветовая схема статусов заявок — используется и у покупателя, и у владельца
export const ORDER_STATUSES = ['Новая', 'В обработке', 'Готово к выдаче', 'Завершена', 'Отменена']

export const STATUS_COLORS = {
  'Новая':            { bg: '#FFFFFF', color: '#111111', border: '#D0D0D0' },
  'В обработке':      { bg: '#FAEEDA', color: '#854F0B', border: '#FAEEDA' },
  'Готово к выдаче':  { bg: '#FAEEDA', color: '#854F0B', border: '#FAEEDA' },
  'Завершена':        { bg: '#EAF3DE', color: '#3B6D11', border: '#EAF3DE' },
  'Отменена':         { bg: '#FBEAF0', color: '#993556', border: '#FBEAF0' },
}
