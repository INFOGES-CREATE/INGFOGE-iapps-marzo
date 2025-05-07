<?php
// Función para determinar la URL base correcta
function getBaseUrl() {
    // Obtener el nombre del host y la primera parte de la URL
    $hostName = $_SERVER['HTTP_HOST'];
    $protocol = isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? 'https://' : 'http://';
    
    // Obtener la ruta base de la aplicación (debe incluir /infoge/public)
    $basePath = '/SALUD_CURICO/infoge/public/';
    
    return $protocol . $hostName . $basePath;
}

// Función para determinar la ruta del sistema de archivos
function getSystemPath() {
    // Ruta completa al archivo actual
    $currentFilePath = $_SERVER['SCRIPT_FILENAME'];
    
    // Buscar la posición de '/public/' en la ruta
    $publicPos = strpos($currentFilePath, '/public/');
    
    if ($publicPos === false) {
        $publicPos = strpos($currentFilePath, '\\public\\'); // Para Windows
    }
    
    if ($publicPos !== false) {
        // Devolver la ruta hasta el directorio public incluido
        return substr($currentFilePath, 0, $publicPos + 8); // +8 para incluir '/public/'
    } else {
        // Fallback: obtener el directorio del script actual
        return dirname($_SERVER['SCRIPT_FILENAME']) . '/';
    }
}

// Obtener la URL base
$baseUrl = getBaseUrl();

// Determinar la página actual para resaltar el menú
$currentPage = basename($_SERVER['SCRIPT_NAME']);
?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Portal Público - Sistema de Salud Curicó</title>
    <meta name="description" content="Portal público del Sistema de Salud de Curicó. Accede a información sobre centros de salud, estadísticas y herramientas para el cuidado de tu salud.">
    
    <!-- Favicon -->
    <link rel="shortcut icon" href="<?php echo $baseUrl; ?>images/favicon.png" type="image/x-icon">
    
    <!-- Fuentes -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&family=Montserrat:wght@400;500;600;700&display=swap" rel="stylesheet">
    
    <!-- CSS -->
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0-alpha1/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/animate.css@4.1.1/animate.min.css">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/aos@2.3.4/dist/aos.css">
    <link rel="stylesheet" href="<?php echo $baseUrl; ?>css/styles.css">
    <link rel="stylesheet" href="<?php echo $baseUrl; ?>/css/herramientas.css">
    <link rel="stylesheet" href="<?php echo $baseUrl; ?>css/chatbot.css">
    <link rel="stylesheet" href="<?php echo $baseUrl; ?>css/premium-news.css">
    <link rel="stylesheet" href="<?php echo $baseUrl; ?>../css/herramientas.css">
    <link rel="stylesheet" href="<?php echo $baseUrl; ?>../css/chatbot.css">
    <link rel="stylesheet" href="<?php echo $baseUrl; ?>../css/premium-news.css">
    <link rel="stylesheet" href="<?php echo $baseUrl; ?>../css/styles.css">


    
</head>
<body>
    <!-- Header y Navegación -->
    <nav class="navbar navbar-expand-lg sticky-top">
        <div class="container">
            <a class="navbar-brand" href="<?php echo $baseUrl; ?>index.php">
                <img src="<?php echo $baseUrl; ?>images/logo2.png" alt="Logo Salud Curicó">
                SALUD CURICÓ
            </a>
            <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav" aria-controls="navbarNav" aria-expanded="false" aria-label="Toggle navigation">
                <span class="navbar-toggler-icon"></span>
            </button>
            <div class="collapse navbar-collapse" id="navbarNav">
                <ul class="navbar-nav ms-auto">
                    <li class="nav-item">
                        <a class="nav-link <?php echo ($currentPage == 'index.php') ? 'active' : ''; ?>" href="<?php echo $baseUrl; ?>index.php">Inicio</a>
                    </li>
                    <li class="nav-item">
                        <a class="nav-link" href="<?php echo $baseUrl; ?>index.php#centros">Centros de Salud</a>
                    </li>
                    <li class="nav-item">
                        <a class="nav-link <?php echo ($currentPage == 'noticias.php') ? 'active' : ''; ?>" href="<?php echo $baseUrl; ?>modules/noticias.php">Noticias</a>
                    </li>
                    <li class="nav-item">
                        <a class="nav-link <?php echo ($currentPage == 'servicios.php') ? 'active' : ''; ?>" href="<?php echo $baseUrl; ?>modules/servicios.php">Servicios</a>
                    </li>
                    <li class="nav-item">
                        <a class="nav-link <?php echo ($currentPage == 'herramientas.php') ? 'active' : ''; ?>" href="<?php echo $baseUrl; ?>modules/herramientas.php">Herramientas</a>
                    </li>
                    <li class="nav-item">
                       <a class=nav-link href="https://sismaule.ssmaule.cl/SALUD/desexa/examenes">Ver Examenes</a>
                    <li class="nav-item">
                        <a class="nav-link" href="<?php echo $baseUrl; ?>index.php#comentarios">Comentarios</a>
                    </li>
                    <?php if (isset($_SESSION['user_id'])): ?>
                        <li class="nav-item dropdown">
                            <a class="nav-link dropdown-toggle" href="#" id="userDropdown" role="button" data-bs-toggle="dropdown" aria-expanded="false">
                                <i class="fas fa-user-circle me-1"></i> Mi Cuenta
                            </a>
                            <ul class="dropdown-menu dropdown-menu-end" aria-labelledby="userDropdown">
                                <li><a class="dropdown-item" href="<?php echo $baseUrl; ?>modules/perfil.php"><i class="fas fa-user me-2"></i> Mi Perfil</a></li>
                                <li><a class="dropdown-item" href="<?php echo $baseUrl; ?>modules/examenes.php"><i class="fas fa-flask me-2"></i> Mis Exámenes</a></li>
                                <li><hr class="dropdown-divider"></li>
                                <li><a class="dropdown-item" href="<?php echo $baseUrl; ?>logout.php"><i class="fas fa-sign-out-alt me-2"></i> Cerrar Sesión</a></li>
                            </ul>
                        </li>
                    <?php else: ?>
                        <li class="nav-item">
                            <a class="nav-link btn btn-primary ms-2" href="<?php echo $baseUrl; ?>login.php">Acceder</a>
                        </li>
                    <?php endif; ?>
                </ul>
            </div>
        </div>
    </nav>