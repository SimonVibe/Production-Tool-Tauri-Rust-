export interface ValidationResult {
  isValid: boolean;
  status: 'valid' | 'invalid' | 'warning';
  message: string;
  badge?: string;
}

// Windows forbidden characters in filenames (except drive colon and UNC slashes)
const ILLEGAL_CHARS_REGEX = /[<>"|?*]/;

// Known executable and script extensions in Windows environments
const EXECUTABLE_EXTENSIONS = ['.exe', '.bat', '.cmd', '.ps1', '.vbs', '.cpl', '.msc', '.lnk', '.com'];

// Known built-in Windows commands/tools without explicit extension
const KNOWN_BUILTIN_COMMANDS = ['control', 'dxdiag', 'msinfo32', 'devmgmt.msc', 'cleanmgr', 'regedit', 'cmd', 'powershell'];

/**
 * Validates a file path intended to be executed (tool, script, cpl applet)
 */
export function validateExecutablePath(rawPath: string): ValidationResult {
  const path = rawPath.trim();

  if (!path) {
    return {
      isValid: false,
      status: 'invalid',
      message: 'Le chemin ne peut pas être vide.',
    };
  }

  // Check for illegal characters
  if (ILLEGAL_CHARS_REGEX.test(path)) {
    return {
      isValid: false,
      status: 'invalid',
      message: 'Caractères interdits détectés (< > " | ? *).',
    };
  }

  // Check colon usage: only allowed at index 1 for drive letter e.g. "C:\"
  const colonIndex = path.indexOf(':');
  if (colonIndex !== -1) {
    if (colonIndex !== 1 || !/^[a-zA-Z]:/.test(path)) {
      return {
        isValid: false,
        status: 'invalid',
        message: 'Format de lettre de lecteur invalide (ex: C:\\chemin).',
      };
    }
    // Check if there are additional colons
    if (path.indexOf(':', 2) !== -1) {
      return {
        isValid: false,
        status: 'invalid',
        message: 'Plusieurs deux-points (:) détectés dans le chemin.',
      };
    }
  }

  // Check if it's a UNC path for an executable
  if (path.startsWith('\\\\') || path.startsWith('//')) {
    const normalized = path.replace(/\//g, '\\');
    const segments = normalized.split('\\').filter(Boolean);
    if (segments.length < 2) {
      return {
        isValid: false,
        status: 'invalid',
        message: 'Le chemin réseau UNC doit inclure le serveur et le partage (ex: \\\\serveur\\partage\\app.exe).',
      };
    }
  } else if (path.startsWith('\\') && !path.startsWith('\\\\')) {
    return {
      isValid: false,
      status: 'invalid',
      message: 'Chemin réseau incomplet : utilisez un double antislash (\\\\serveur\\partage).',
    };
  }

  // Check extension or known built-in tool
  const cleanPath = path.toLowerCase().replace(/['"]/g, '');
  const isBuiltin = KNOWN_BUILTIN_COMMANDS.some(cmd => cleanPath === cmd || cleanPath.endsWith(`\\${cmd}`) || cleanPath.endsWith(`/${cmd}`));
  
  const hasValidExt = EXECUTABLE_EXTENSIONS.some(ext => cleanPath.endsWith(ext));

  if (isBuiltin || hasValidExt) {
    let badge = 'Exécutable Local';
    if (cleanPath.endsWith('.cpl')) badge = 'Applet Panneau de Config (.cpl)';
    else if (cleanPath.endsWith('.ps1')) badge = 'Script PowerShell (.ps1)';
    else if (cleanPath.endsWith('.bat') || cleanPath.endsWith('.cmd')) badge = 'Script Batch (.bat/.cmd)';
    else if (cleanPath.startsWith('\\\\') || cleanPath.startsWith('//')) badge = 'Exécutable Réseau (UNC)';
    else if (/^[a-zA-Z]:/.test(cleanPath)) badge = 'Chemin Absolu';
    else badge = 'Chemin Relatif';

    return {
      isValid: true,
      status: 'valid',
      message: 'Format d\'exécutable valide.',
      badge,
    };
  }

  // If there is an extension but not an executable one (e.g., .txt, .pdf, .docx, .zip)
  const lastDot = cleanPath.lastIndexOf('.');
  const lastSlash = Math.max(cleanPath.lastIndexOf('\\'), cleanPath.lastIndexOf('/'));
  
  if (lastDot > lastSlash && lastDot !== -1) {
    const ext = cleanPath.substring(lastDot);
    return {
      isValid: false,
      status: 'invalid',
      message: `Extension « ${ext} » non exécutable. Extensions autorisées : .exe, .bat, .cmd, .ps1, .cpl, .msc`,
    };
  }

  // No extension, could be a command with arguments or relative executable
  return {
    isValid: true,
    status: 'warning',
    message: 'Aucune extension explicite (.exe/.bat/.cpl recommandé).',
    badge: 'Commande Système',
  };
}

/**
 * Validates a folder path or network share address (e.g. NAS, network driver repository)
 */
export function validateFolderOrNetworkPath(rawPath: string): ValidationResult {
  const path = rawPath.trim();

  if (!path) {
    return {
      isValid: false,
      status: 'invalid',
      message: 'L\'adresse du dossier ou réseau ne peut pas être vide.',
    };
  }

  // Check for illegal characters
  if (ILLEGAL_CHARS_REGEX.test(path)) {
    return {
      isValid: false,
      status: 'invalid',
      message: 'Caractères interdits détectés (< > " | ? *).',
    };
  }

  // Check colon usage: only allowed as drive letter (e.g. C:\)
  const colonIndex = path.indexOf(':');
  if (colonIndex !== -1) {
    if (colonIndex !== 1 || !/^[a-zA-Z]:/.test(path)) {
      return {
        isValid: false,
        status: 'invalid',
        message: 'Format de lecteur local invalide (ex: C:\\Dossier).',
      };
    }
    if (path.indexOf(':', 2) !== -1) {
      return {
        isValid: false,
        status: 'invalid',
        message: 'Plusieurs deux-points (:) détectés dans le chemin.',
      };
    }
  }

  // Single leading slash check (common mistake for UNC)
  if ((path.startsWith('\\') && !path.startsWith('\\\\')) || (path.startsWith('/') && !path.startsWith('//'))) {
    return {
      isValid: false,
      status: 'invalid',
      message: 'Pour une adresse réseau UNC, commencez par un double antislash (\\\\serveur\\partage).',
    };
  }

  // UNC network share verification: \\server\share or //server/share
  if (path.startsWith('\\\\') || path.startsWith('//')) {
    const normalized = path.replace(/\//g, '\\');
    const segments = normalized.split('\\').filter(Boolean);

    if (segments.length === 0) {
      return {
        isValid: false,
        status: 'invalid',
        message: 'Spécifiez le nom ou l\'adresse IP du serveur réseau.',
      };
    }

    const host = segments[0];

    // If host looks like an IP address, validate IP octets
    if (/^(\d{1,3}\.){3}\d{1,3}$/.test(host)) {
      const octets = host.split('.').map(Number);
      const isInvalidIp = octets.some(o => o < 0 || o > 255);
      if (isInvalidIp) {
        return {
          isValid: false,
          status: 'invalid',
          message: `Adresse IP réseau invalide : « ${host} » (les octets doivent être compris entre 0 et 255).`,
        };
      }
    }

    if (segments.length === 1) {
      return {
        isValid: false,
        status: 'invalid',
        message: `Le chemin UNC doit inclure le nom du dossier partagé (ex: \\\\${host}\\Tech\\Drivers).`,
      };
    }

    return {
      isValid: true,
      status: 'valid',
      message: `Adresse de partage réseau UNC valide (Hôte : ${host}).`,
      badge: 'Partage Réseau SMB/UNC',
    };
  }

  // Local or Mapped drive path (e.g. Z:, Z:\, C:\Drivers or D:\Tech\Drivers)
  if (/^[a-zA-Z]:([\\/]|$)/.test(path)) {
    const driveLetter = path[0].toUpperCase();
    return {
      isValid: true,
      status: 'valid',
      message: `Lecteur local ou réseau (${driveLetter}:) valide.`,
      badge: `Lecteur ${driveLetter}:`,
    };
  }

  // Relative folder path (e.g. Drivers\Models or ./Drivers)
  return {
    isValid: true,
    status: 'valid',
    message: 'Chemin de dossier relatif valide.',
    badge: 'Dossier Relatif',
  };
}
