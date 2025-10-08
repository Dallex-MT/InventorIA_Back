export function sanitizeInput(input: string): string {
  if (!input) return '';
  
  return input
    .trim()
    .replace(/[<>]/g, '')
    .replace(/['"`]/g, '')
    .replace(/\\/g, '');
}

export function validateCedula(cedula: string): { isValid: boolean; error?: string } {
  if (!cedula || cedula.trim().length === 0) {
    return { isValid: false, error: 'La cédula es requerida' };
  }
  
  const sanitizedCedula = sanitizeInput(cedula);
  
  if (sanitizedCedula.length < 5 || sanitizedCedula.length > 20) {
    return { isValid: false, error: 'La cédula debe tener entre 5 y 20 caracteres' };
  }
  
  if (!/^[a-zA-Z0-9-]+$/.test(sanitizedCedula)) {
    return { isValid: false, error: 'La cédula solo puede contener letras, números y guiones' };
  }
  
  return { isValid: true };
}

export function validateEmail(email: string): { isValid: boolean; error?: string } {
  if (!email || email.trim().length === 0) {
    return { isValid: false, error: 'El correo electrónico es requerido' };
  }
  
  const sanitizedEmail = sanitizeInput(email);
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(sanitizedEmail)) {
    return { isValid: false, error: 'El formato del correo electrónico no es válido' };
  }
  
  if (sanitizedEmail.length > 150) {
    return { isValid: false, error: 'El correo electrónico no puede exceder 150 caracteres' };
  }
  
  return { isValid: true };
}

export function validateNombreUsuario(nombre: string): { isValid: boolean; error?: string } {
  if (!nombre || nombre.trim().length === 0) {
    return { isValid: false, error: 'El nombre de usuario es requerido' };
  }
  
  const sanitizedNombre = sanitizeInput(nombre);
  
  if (sanitizedNombre.length < 3 || sanitizedNombre.length > 100) {
    return { isValid: false, error: 'El nombre de usuario debe tener entre 3 y 100 caracteres' };
  }
  
  if (!/^[a-zA-Z0-9\sáéíóúÁÉÍÓÚñÑ]+$/.test(sanitizedNombre)) {
    return { isValid: false, error: 'El nombre de usuario solo puede contener letras, números y espacios' };
  }
  
  return { isValid: true };
}

export function validateRolId(rolId: number): { isValid: boolean; error?: string } {
  if (!rolId || rolId <= 0) {
    return { isValid: false, error: 'El ID del rol es requerido y debe ser un número positivo' };
  }
  
  return { isValid: true };
}

export function escapeLikeString(str: string): string {
  return str.replace(/[%_]/g, '\\$&');
}