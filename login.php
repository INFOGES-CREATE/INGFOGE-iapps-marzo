<?php

// Cargar configuración y funciones
require_once 'includes/config.php';
require_once 'includes/functions.php';
require_once '../common/database.php';

// Redirigir si ya está autenticado
if (isLoggedIn()) {
    header("Location: index.php");
    exit;
}

// Variables para mensajes
$login_error = '';
$register_success = '';

// Procesar formulario de login
if ($_SERVER["REQUEST_METHOD"] == "POST" && isset($_POST['login'])) {
    $usuario = filter_input(INPUT_POST, 'usuario', FILTER_SANITIZE_STRING);
    $password = $_POST['password'];
    
    if (empty($usuario) || empty($password)) {
        $login_error = "Por favor ingrese usuario y contraseña.";
    } else {
        // Conectar a la base de datos
        $conn = connectDB();
        
        // Buscar usuario en la base de datos
        $sql = "SELECT * FROM usuarios WHERE (nombre_usuario = ? OR correo = ? OR rut = ?) AND activo = 1";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param("sss", $usuario, $usuario, $usuario);
        $stmt->execute();
        $result = $stmt->get_result();
        
        if ($result && $result->num_rows > 0) {
            $user = $result->fetch_assoc();
            
            // Verificar si la cuenta está bloqueada
            if (!empty($user['bloqueado_hasta']) && new DateTime($user['bloqueado_hasta']) > new DateTime()) {
                $login_error = "Su cuenta está temporalmente bloqueada debido a múltiples intentos fallidos. Por favor intente más tarde.";
            } else {
                // Verificar contraseña
                if (password_verify($password, $user['contrasena_hash'])) {
                    // Iniciar sesión
                    $_SESSION['user_id'] = $user['id_usuario'];
                    $_SESSION['user_nombre'] = $user['nombre_usuario'];
                    $_SESSION['user_nombres'] = $user['nombres'];
                    $_SESSION['user_apellidos'] = $user['apellidos'];
                    $_SESSION['user_correo'] = $user['correo'];
                    
                    // Obtener roles del usuario
                    $sqlRoles = "SELECT r.id_rol, r.nombre_rol 
                                FROM usuarios_roles ur 
                                JOIN roles r ON ur.id_rol = r.id_rol 
                                WHERE ur.id_usuario = ?";
                    $stmtRoles = $conn->prepare($sqlRoles);
                    $stmtRoles->bind_param("i", $user['id_usuario']);
                    $stmtRoles->execute();
                    $resultRoles = $stmtRoles->get_result();
                    
                    $roles = [];
                    $role_ids = [];
                    if ($resultRoles && $resultRoles->num_rows > 0) {
                        while ($role = $resultRoles->fetch_assoc()) {
                            $roles[] = $role['nombre_rol'];
                            $role_ids[] = $role['id_rol'];
                        }
                    }
                    
                    $_SESSION['user_roles'] = $role_ids;
                    $_SESSION['user_roles_names'] = $roles;
                    
                    // Actualizar último acceso
                    $sqlUpdate = "UPDATE usuarios SET ultimo_acceso = NOW(), intentos_fallidos = 0, bloqueado_hasta = NULL WHERE id_usuario = ?";
                    $stmtUpdate = $conn->prepare($sqlUpdate);
                    $stmtUpdate->bind_param("i", $user['id_usuario']);
                    $stmtUpdate->execute();
                    
                    // Redirigir
                    if (isset($_SESSION['redirect_after_login']) && !empty($_SESSION['redirect_after_login'])) {
                        $redirect = $_SESSION['redirect_after_login'];
                        unset($_SESSION['redirect_after_login']);
                        header("Location: $redirect");
                    } else {
                        header("Location: index.php");
                    }
                    exit;
                } else {
                    // Incrementar intentos fallidos
                    $intentos = $user['intentos_fallidos'] + 1;
                    
                    // Bloquear cuenta después de 3 intentos fallidos
                    if ($intentos >= 3) {
                        // Bloquear por 30 minutos
                        $bloqueado_hasta = date('Y-m-d H:i:s', strtotime('+30 minutes'));
                        $sqlBlock = "UPDATE usuarios SET intentos_fallidos = ?, bloqueado_hasta = ? WHERE id_usuario = ?";
                        $stmtBlock = $conn->prepare($sqlBlock);
                        $stmtBlock->bind_param("isi", $intentos, $bloqueado_hasta, $user['id_usuario']);
                        $stmtBlock->execute();
                        
                        $login_error = "Su cuenta ha sido bloqueada temporalmente debido a múltiples intentos fallidos. Por favor intente nuevamente después de 30 minutos.";
                    } else {
                        // Actualizar intentos fallidos
                        $sqlFail = "UPDATE usuarios SET intentos_fallidos = ? WHERE id_usuario = ?";
                        $stmtFail = $conn->prepare($sqlFail);
                        $stmtFail->bind_param("ii", $intentos, $user['id_usuario']);
                        $stmtFail->execute();
                        
                        $login_error = "Usuario o contraseña incorrectos. Intentos restantes: " . (3 - $intentos);
                    }
                }
            }
        } else {
            $login_error = "Usuario no encontrado. Verifique sus credenciales.";
        }
        
        // Cerrar conexión
        $stmt->close();
        $conn->close();
    }
}

// HTML y diseño de la página
include('includes/header.php');
?>

<div class="container my-5">
    <div class="row justify-content-center">
        <div class="col-md-8 col-lg-6">
            <div class="card shadow-lg">
                <div class="card-header bg-primary text-white text-center">
                    <h4 class="mb-0">Acceso al Portal de Salud</h4>
                </div>
                <div class="card-body p-4">
                    <?php if (!empty($login_error)): ?>
                        <div class="alert alert-danger alert-dismissible fade show" role="alert">
                            <i class="fas fa-exclamation-circle me-2"></i> <?php echo $login_error; ?>
                            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
                        </div>
                    <?php endif; ?>
                    
                    <?php if (!empty($register_success)): ?>
                        <div class="alert alert-success alert-dismissible fade show" role="alert">
                            <i class="fas fa-check-circle me-2"></i> <?php echo $register_success; ?>
                            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
                        </div>
                    <?php endif; ?>
                    
                    <form method="post" action="login.php">
                        <div class="mb-3">
                            <label for="usuario" class="form-label">Usuario, Correo o RUT</label>
                            <div class="input-group">
                                <span class="input-group-text"><i class="fas fa-user"></i></span>
                                <input type="text" class="form-control" id="usuario" name="usuario" required>
                            </div>
                        </div>
                        <div class="mb-3">
                            <label for="password" class="form-label">Contraseña</label>
                            <div class="input-group">
                                <span class="input-group-text"><i class="fas fa-lock"></i></span>
                                <input type="password" class="form-control" id="password" name="password" required>
                                <button class="btn btn-outline-secondary toggle-password" type="button" data-target="password">
                                    <i class="fas fa-eye"></i>
                                </button>
                            </div>
                        </div>
                        <div class="d-flex justify-content-between align-items-center mb-3">
                            <div class="form-check">
                                <input class="form-check-input" type="checkbox" id="remember" name="remember">
                                <label class="form-check-label" for="remember">Recordarme</label>
                            </div>
                            <a href="recuperar_password.php" class="text-decoration-none">¿Olvidó su contraseña?</a>
                        </div>
                        <div class="d-grid">
                            <button type="submit" name="login" class="btn btn-primary btn-lg">
                                <i class="fas fa-sign-in-alt me-2"></i> Iniciar Sesión
                            </button>
                        </div>
                    </form>
                    
                    <hr class="my-4">
                    
                    <div class="text-center">
                        <p class="mb-2">¿No tiene una cuenta?</p>
                        <a href="registro.php" class="btn btn-outline-primary">
                            <i class="fas fa-user-plus me-2"></i> Registrarse
                        </a>
                    </div>
                </div>
                <div class="card-footer bg-light text-center py-3">
                    <p class="text-muted mb-0">Contáctenos si tiene problemas para acceder a su cuenta.</p>
                </div>
            </div>
        </div>
    </div>
</div>

<script>
    // Funcionalidad para mostrar/ocultar contraseña
    document.querySelector('.toggle-password').addEventListener('click', function() {
        const targetId = this.getAttribute('data-target');
        const inputField = document.getElementById(targetId);
        
        // Cambiar tipo de input
        if (inputField.type === 'password') {
            inputField.type = 'text';
            this.innerHTML = '<i class="fas fa-eye-slash"></i>';
        } else {
            inputField.type = 'password';
            this.innerHTML = '<i class="fas fa-eye"></i>';
        }
    });
</script>

<?php
include('includes/footer.php');
?>