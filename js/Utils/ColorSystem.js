// src/utils/ColorSystem.js

/**
 * Color system with built-in contrast validation for accessibility
 */
class ColorSystem {
  constructor() {
    this.colors = {
      primary: {
        base: '#4285F4',
        dark: '#1a5dd4',
        light: '#82b0f7',
        contrast: '#ffffff'
      },
      success: {
        base: '#4CAF50',
        dark: '#3d8b40',
        light: '#80c883',
        contrast: '#ffffff'
      },
      warning: {
        base: '#EC9F05', // Enhanced for better contrast
        dark: '#c78500',
        light: '#ffb83d',
        contrast: '#000000'
      },
      error: {
        base: '#c62828',
        dark: '#8e0000',
        light: '#ff5f52',
        contrast: '#ffffff'
      },
      neutral: {
        base: '#5C5C5C', // Darkened for better contrast
        dark: '#3d3d3d',
        light: '#8a8a8a',
        contrast: '#ffffff'
      },
      background: {
        base: '#ffffff',
        dark: '#f5f5f5',
        paper: '#ffffff',
        contrast: '#212121'
      }
    };
    
    // Validate all color combinations
    this.validateColors();
  }
  
  /**
   * Check if color contrast meets WCAG AA standard (4.5:1 for normal text)
   * @param {string} foreground - Foreground color hex code
   * @param {string} background - Background color hex code
   * @returns {Object} Contrast ratio and compliance status
   */
  checkContrast(foreground, background) {
    // Calculate relative luminance based on the WCAG formula
    const getLuminance = (hex) => {
      const rgb = this.hexToRgb(hex);
      const [r, g, b] = [rgb.r, rgb.g, rgb.b].map(c => {
        c = c / 255;
        return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
      });
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    
    const luminance1 = getLuminance(foreground);
    const luminance2 = getLuminance(background);
    
    const brightest = Math.max(luminance1, luminance2);
    const darkest = Math.min(luminance1, luminance2);
    
    const contrast = (brightest + 0.05) / (darkest + 0.05);
    
    return {
      ratio: contrast,
      passes: {
        AA: contrast >= 4.5,
        AALarge: contrast >= 3,
        AAA: contrast >= 7,
        AAALarge: contrast >= 4.5
      }
    };
  }
  
  /**
   * Convert hex color to RGB values
   * @param {string} hex - Hex color code
   * @returns {Object} RGB values
   */
  hexToRgb(hex) {
    // Remove # if present
    hex = hex.replace(/^#/, '');
    
    // Parse hex values
    const bigint = parseInt(hex, 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    
    return { r, g, b };
  }
  
  /**
   * Validate all color combinations for accessibility
   * @returns {boolean} Whether all colors pass validation
   */
  validateColors() {
    const issues = [];
    
    // Check each color combination
    Object.keys(this.colors).forEach(colorName => {
      const color = this.colors[colorName];
      
      // Check base color against its contrast color
      const baseContrast = this.checkContrast(color.base, color.contrast);
      if (!baseContrast.passes.AA) {
        issues.push(`${colorName}.base (${color.base}) with contrast color (${color.contrast}) has insufficient contrast: ${baseContrast.ratio.toFixed(2)}:1`);
      }
      
      // Check dark color against its contrast color
      if (color.dark) {
        const darkContrast = this.checkContrast(color.dark, color.contrast);
        if (!darkContrast.passes.AA) {
          issues.push(`${colorName}.dark (${color.dark}) with contrast color (${color.contrast}) has insufficient contrast: ${darkContrast.ratio.toFixed(2)}:1`);
        }
      }
    });
    
    if (issues.length > 0) {
      console.warn('Color contrast issues found:', issues);
    }
    
    return issues.length === 0;
  }
  
  /**
   * Get CSS variables string for all colors
   * @returns {string} CSS variables
   */
  getCssVariables() {
    let css = '';
    
    Object.keys(this.colors).forEach(colorName => {
      const color = this.colors[colorName];
      
      Object.keys(color).forEach(variant => {
        css += `--${colorName}-${variant}: ${color[variant]};\n`;
      });
    });
    
    return css;
  }
  
  /**
   * Get a color by name and variant
   * @param {string} name - Color name
   * @param {string} variant - Color variant (base, dark, light, contrast)
   * @returns {string} Color hex code
   */
  getColor(name, variant = 'base') {
    if (!this.colors[name]) {
      console.warn(`Color "${name}" not found`);
      return '#000000';
    }
    
    return this.colors[name][variant] || this.colors[name].base;
  }
}

// Export singleton instance
export const colorSystem = new ColorSystem();
