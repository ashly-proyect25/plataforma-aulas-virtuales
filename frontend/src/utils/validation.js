// frontend/src/utils/validation.js

/**
 * Validaciones para formularios de usuario
 */

/**
 * Valida que el nombre contenga al menos nombre y apellido
 * @param {string} name - Nombre completo
 * @returns {object} { valid: boolean, message: string }
 */
export const validateFullName = (name) => {
  if (!name || name.trim().length === 0) {
    return { valid: false, message: 'El nombre es requerido' };
  }

  const trimmedName = name.trim();
  const words = trimmedName.split(/\s+/);

  if (words.length < 2) {
    return { valid: false, message: 'Debes ingresar al menos un nombre y un apellido' };
  }

  if (words.some(word => word.length < 2)) {
    return { valid: false, message: 'El nombre y apellido deben tener al menos 2 caracteres cada uno' };
  }

  // Validar que solo contenga letras, espacios, acentos y caracteres comunes en nombres
  const nameRegex = /^[a-záéíóúñüA-ZÁÉÍÓÚÑÜ\s'-]+$/;
  if (!nameRegex.test(trimmedName)) {
    return { valid: false, message: 'El nombre solo puede contener letras y espacios' };
  }

  return { valid: true, message: '' };
};

/**
 * Valida que el username no contenga espacios
 * @param {string} username - Nombre de usuario
 * @returns {object} { valid: boolean, message: string }
 */
export const validateUsername = (username) => {
  if (!username || username.trim().length === 0) {
    return { valid: false, message: 'El usuario es requerido' };
  }

  if (username.includes(' ')) {
    return { valid: false, message: 'El usuario no puede contener espacios' };
  }

  if (username.length < 3) {
    return { valid: false, message: 'El usuario debe tener al menos 3 caracteres' };
  }

  // Solo letras, números, puntos, guiones y guiones bajos
  const usernameRegex = /^[a-zA-Z0-9._-]+$/;
  if (!usernameRegex.test(username)) {
    return { valid: false, message: 'El usuario solo puede contener letras, números, puntos, guiones y guiones bajos' };
  }

  return { valid: true, message: '' };
};

/**
 * Valida el formato del correo electrónico
 * @param {string} email - Correo electrónico
 * @returns {object} { valid: boolean, message: string }
 */
export const validateEmail = (email) => {
  if (!email || email.trim().length === 0) {
    return { valid: false, message: 'El correo electrónico es requerido' };
  }

  if (email.includes(' ')) {
    return { valid: false, message: 'El correo electrónico no puede contener espacios' };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { valid: false, message: 'El correo electrónico no es válido' };
  }

  return { valid: true, message: '' };
};

/**
 * Valida la contraseña con requisitos de seguridad
 * @param {string} password - Contraseña
 * @returns {object} { valid: boolean, message: string }
 */
export const validatePassword = (password) => {
  if (!password || password.length === 0) {
    return { valid: false, message: 'La contraseña es requerida' };
  }

  if (password.includes(' ')) {
    return { valid: false, message: 'La contraseña no puede contener espacios' };
  }

  if (password.length < 8) {
    return { valid: false, message: 'La contraseña debe tener al menos 8 caracteres' };
  }

  // Debe contener al menos un número
  if (!/\d/.test(password)) {
    return { valid: false, message: 'La contraseña debe contener al menos un número' };
  }

  // Debe contener al menos una letra
  if (!/[a-zA-Z]/.test(password)) {
    return { valid: false, message: 'La contraseña debe contener al menos una letra' };
  }

  return { valid: true, message: '' };
};

/**
 * Valida todos los campos de un formulario de usuario
 * @param {object} formData - Datos del formulario { name, username, email, password }
 * @param {boolean} validatePasswordField - Si debe validar el password (false para edición)
 * @returns {object} { valid: boolean, errors: object }
 */
export const validateUserForm = (formData, validatePasswordField = true) => {
  const errors = {};
  let isValid = true;

  // Validar nombre completo
  const nameValidation = validateFullName(formData.name);
  if (!nameValidation.valid) {
    errors.name = nameValidation.message;
    isValid = false;
  }

  // Validar username
  const usernameValidation = validateUsername(formData.username);
  if (!usernameValidation.valid) {
    errors.username = usernameValidation.message;
    isValid = false;
  }

  // Validar email
  const emailValidation = validateEmail(formData.email);
  if (!emailValidation.valid) {
    errors.email = emailValidation.message;
    isValid = false;
  }

  // Validar password (si se requiere)
  if (validatePasswordField && formData.password !== undefined) {
    const passwordValidation = validatePassword(formData.password);
    if (!passwordValidation.valid) {
      errors.password = passwordValidation.message;
      isValid = false;
    }
  }

  return { valid: isValid, errors };
};
