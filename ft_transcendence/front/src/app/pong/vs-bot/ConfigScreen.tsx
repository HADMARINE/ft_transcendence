import React, { useState } from 'react';

const styles = {
  configScreen: {
    backgroundColor: 'rgba(22, 33, 62, 0.8)',
    padding: '30px',
    borderRadius: '10px',
    boxShadow: '0 0 20px rgba(76, 201, 240, 0.5)',
    width: '400px',
    maxWidth: '90%',
    textAlign: 'center',
  },
  configTitle: {
    fontSize: '1.8rem',
    marginBottom: '20px',
    color: '#4cc9f0',
  },
  configForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    marginBottom: '15px',
  },
  label: {
    marginBottom: '5px',
    color: '#e6e6e6',
    textAlign: 'left',
  },
  colorButtonsContainer: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    justifyContent: 'space-between',
  },
  colorButton: {
    width: '30px',
    height: '30px',
    borderRadius: '50%',
    border: '2px solid transparent',
    cursor: 'pointer',
    transition: 'all 0.2s',
    '&:hover': {
      transform: 'scale(1.1)',
    }
  },
  colorButtonSelected: {
    border: '2px solid white',
    boxShadow: '0 0 8px white',
  },
  rangeInput: {
    width: '100%',
  },
  rangeValue: {
    display: 'inline-block',
    minWidth: '30px',
    textAlign: 'center',
    color: '#4cc9f0',
    fontWeight: 'bold',
  },
  difficultyContainer: {
    margin: '15px 0',
  },
  difficultyLabel: {
    marginBottom: '10px',
    color: '#e6e6e6',
    textAlign: 'center',
  },
  difficultyButtons: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '10px',
    flexWrap: 'wrap',
  },
  difficultyButton: {
    flex: 1,
    padding: '10px',
    borderRadius: '5px',
    border: 'none',
    cursor: 'pointer',
    fontWeight: 'bold',
    transition: 'all 0.3s',
    minWidth: '80px',
  },
  startButton: {
    padding: '15px 40px',
    fontSize: '1.2rem',
    backgroundColor: '#4cc9f0',
    color: '#16213e',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
    fontWeight: 'bold',
    marginTop: '10px',
    transition: 'all 0.3s',
    boxShadow: '0 0 15px rgba(76, 201, 240, 0.5)',
    '&:hover': {
      backgroundColor: '#3ab0d0',
      transform: 'scale(1.05)',
    }
  },
};

const ConfigScreen = ({ onConfigSubmit }) => {
  const [config, setConfig] = useState({
    leftPaddleColor: '#4cc9f0',
    rightPaddleColor: '#f72585',
    ballColor: '#ffffff',
    leftPaddleSpeed: 23,
    botSpeed: 5,
  });

  const colorOptions = [
    '#4cc9f0', 
    '#f72585', 
    '#7209b7', 
    '#3a0ca3', 
    '#4361ee', 
    '#4cc9f0', 
    '#ffbe0b', 
    '#fb5607', 
    '#ff006e', 
    '#8338ec', 
    '#3a86ff', 
    '#06d6a0', 
    '#118ab2', 
    '#073b4c', 
    '#ef476f', 
    '#ffd166', 
    '#ffffff', 
  ];

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const finalValue = type === 'checkbox' 
      ? checked 
      : type === 'range' 
        ? Number(value) 
        : value;
    
    setConfig(prev => ({
      ...prev,
      [name]: finalValue
    }));
  };

  const setColor = (colorType, color) => {
    setConfig(prev => ({
      ...prev,
      [colorType]: color
    }));
  };

  const setBotDifficulty = (speed) => {
    setConfig(prev => ({
      ...prev,
      botSpeed: speed
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onConfigSubmit(config);
  };

  return (
    <div style={styles.configScreen}>
      <h2 style={styles.configTitle}>Configuration du jeu</h2>
      <form onSubmit={handleSubmit} style={styles.configForm}>
        <div style={styles.inputGroup}>
          <label style={styles.label}>Couleur raquette gauche:</label>
          <div style={styles.colorButtonsContainer}>
            {colorOptions.map((color, index) => (
              <button
                key={`left-${index}`}
                type="button"
                style={{
                  ...styles.colorButton,
                  backgroundColor: color,
                  ...(config.leftPaddleColor === color ? styles.colorButtonSelected : {})
                }}
                onClick={() => setColor('leftPaddleColor', color)}
                title={color}
              />
            ))}
          </div>
        </div>
        
        <div style={styles.inputGroup}>
          <label style={styles.label}>Couleur raquette droite:</label>
          <div style={styles.colorButtonsContainer}>
            {colorOptions.map((color, index) => (
              <button
                key={`right-${index}`}
                type="button"
                style={{
                  ...styles.colorButton,
                  backgroundColor: color,
                  ...(config.rightPaddleColor === color ? styles.colorButtonSelected : {})
                }}
                onClick={() => setColor('rightPaddleColor', color)}
                title={color}
              />
            ))}
          </div>
        </div>
        
        <div style={styles.inputGroup}>
          <label style={styles.label}>Couleur de la balle:</label>
          <div style={styles.colorButtonsContainer}>
            {colorOptions.map((color, index) => (
              <button
                key={`ball-${index}`}
                type="button"
                style={{
                  ...styles.colorButton,
                  backgroundColor: color,
                  ...(config.ballColor === color ? styles.colorButtonSelected : {})
                }}
                onClick={() => setColor('ballColor', color)}
                title={color}
              />
            ))}
          </div>
        </div>

        <div style={styles.inputGroup}>
          <label style={styles.label}>
            Vitesse raquette gauche: <span style={styles.rangeValue}>{config.leftPaddleSpeed}</span>
          </label>
          <input
            type="range"
            name="leftPaddleSpeed"
            min="15"
            max="30"
            value={config.leftPaddleSpeed}
            onChange={handleChange}
            style={styles.rangeInput}
          />
        </div>
        
        <div style={styles.difficultyContainer}>
          <label style={styles.difficultyLabel}>
            Difficulté du bot:
          </label>
          <div style={styles.difficultyButtons}>
            <button 
              type="button"
              style={{ 
                ...styles.difficultyButton,
                backgroundColor: config.botSpeed === 3 ? '#4cc9f0' : '#16213e',
                color: config.botSpeed === 3 ? '#16213e' : '#4cc9f0',
              }}
              onClick={() => setBotDifficulty(3)}
            >
              Easy
            </button>
            <button 
              type="button"
              style={{ 
                ...styles.difficultyButton,
                backgroundColor: config.botSpeed === 5 ? '#4cc9f0' : '#16213e',
                color: config.botSpeed === 5 ? '#16213e' : '#4cc9f0',
              }}
              onClick={() => setBotDifficulty(5)}
            >
              Medium
            </button>
            <button 
              type="button"
              style={{ 
                ...styles.difficultyButton,
                backgroundColor: config.botSpeed === 7 ? '#4cc9f0' : '#16213e',
                color: config.botSpeed === 7 ? '#16213e' : '#4cc9f0',
              }}
              onClick={() => setBotDifficulty(7)}
            >
              Difficile
            </button>
            <button 
              type="button"
              style={{ 
                ...styles.difficultyButton,
                backgroundColor: config.botSpeed === 10 ? '#4cc9f0' : '#16213e',
                color: config.botSpeed === 10 ? '#16213e' : '#4cc9f0',
              }}
              onClick={() => setBotDifficulty(10)}
            >
              Impossible
            </button>
          </div>
          <div style={{ textAlign: 'center', marginTop: '5px', color: '#4cc9f0', fontWeight: 'bold' }}>
            Vitesse: {config.botSpeed}
          </div>
        </div>
        
        <button type="submit" style={styles.startButton}>
          Démarrer le jeu
        </button>
      </form>
    </div>
  );
};

export default ConfigScreen;