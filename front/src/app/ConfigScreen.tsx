"use client";

import React, { useState } from 'react';

const styles = {
  configContainer: {
    backgroundColor: 'rgba(22, 33, 62, 0.8)',
    padding: '30px',
    borderRadius: '10px',
    boxShadow: '0 0 20px rgba(0, 0, 0, 0.5)',
    maxWidth: '600px',
    width: '100%',
  },
  configTitle: {
    fontSize: '1.8rem',
    marginBottom: '20px',
    textAlign: 'center',
    color: '#4cc9f0',
  },
  configForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '25px',
  },
  configGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  configLabel: {
    fontSize: '1.1rem',
    fontWeight: 'bold',
  },
  configSlider: {
    width: '100%',
    height: '10px',
    borderRadius: '5px',
    outline: 'none',
  },
  configColorInput: {
    width: '60px',
    height: '40px',
    padding: '0',
    border: 'none',
    background: 'none',
    cursor: 'pointer',
  },
  configColorPreview: {
    width: '100%',
    height: '30px',
    borderRadius: '4px',
    marginTop: '5px',
    border: '1px solid rgba(255,255,255,0.3)',
  },
  configButton: {
    padding: '15px 30px',
    fontSize: '1.1rem',
    backgroundColor: '#4cc9f0',
    color: '#16213e',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
    fontWeight: 'bold',
    marginTop: '10px',
    transition: 'all 0.3s',
    '&:hover': {
      backgroundColor: '#3ab0d0',
      transform: 'scale(1.05)',
    }
  },
};

const ConfigScreen = ({ onConfigSubmit }) => {
  const [leftPaddleSpeed, setLeftPaddleSpeed] = useState(20);
  const [rightPaddleSpeed, setRightPaddleSpeed] = useState(20);
  const [leftPaddleColor, setLeftPaddleColor] = useState('#4cc9f0');
  const [rightPaddleColor, setRightPaddleColor] = useState('#4cc9f0');
  const [ballColor, setBallColor] = useState('#f72585');

  const handleSubmit = (e) => {
    e.preventDefault();
    onConfigSubmit({
      leftPaddleSpeed,
      rightPaddleSpeed,
      leftPaddleColor,
      rightPaddleColor,
      ballColor
    });
  };

  return (
    <div style={styles.configContainer}>
      <h2 style={styles.configTitle}>Configuration du jeu</h2>
      
      <form onSubmit={handleSubmit} style={styles.configForm}>
        {}
        <div style={styles.configGroup}>
          <label style={styles.configLabel}>
            Vitesse raquette gauche: {leftPaddleSpeed}
          </label>
          <input 
            type="range" 
            min="5" 
            max="30" 
            step="0.5"
            value={leftPaddleSpeed} 
            onChange={(e) => setLeftPaddleSpeed(parseFloat(e.target.value))}
            style={styles.configSlider}
          />
        </div>
        
        {}
        <div style={styles.configGroup}>
          <label style={styles.configLabel}>
            Vitesse raquette droite: {rightPaddleSpeed}
          </label>
          <input 
            type="range" 
            min="5" 
            max="30" 
            step="0.5"
            value={rightPaddleSpeed} 
            onChange={(e) => setRightPaddleSpeed(parseFloat(e.target.value))}
            style={styles.configSlider}
          />
        </div>
        
        {}
        <div style={styles.configGroup}>
          <label style={styles.configLabel}>
            Couleur raquette gauche:
          </label>
          <input 
            type="color" 
            value={leftPaddleColor} 
            onChange={(e) => setLeftPaddleColor(e.target.value)}
            style={styles.configColorInput}
          />
          <div style={{ 
            ...styles.configColorPreview, 
            backgroundColor: leftPaddleColor 
          }}></div>
        </div>
        
        <div style={styles.configGroup}>
          <label style={styles.configLabel}>
            Couleur raquette droite:
          </label>
          <input 
            type="color" 
            value={rightPaddleColor} 
            onChange={(e) => setRightPaddleColor(e.target.value)}
            style={styles.configColorInput}
          />
          <div style={{ 
            ...styles.configColorPreview, 
            backgroundColor: rightPaddleColor 
          }}></div>
        </div>
        
        <div style={styles.configGroup}>
          <label style={styles.configLabel}>
            Couleur de la balle:
          </label>
          <input 
            type="color" 
            value={ballColor} 
            onChange={(e) => setBallColor(e.target.value)}
            style={styles.configColorInput}
          />
          <div style={{ 
            ...styles.configColorPreview, 
            backgroundColor: ballColor 
          }}></div>
        </div>
        
        <button type="submit" style={styles.configButton}>
          Commencer le jeu
        </button>
      </form>
    </div>
  );
};

export default ConfigScreen;