import React, { useState, useEffect, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import './PendulumSimulator.css'; // Asegúrate de crear este archivo CSS

const PendulumSimulator = () => {
  // Función para convertir ángulos a notación fraccionaria de π
  const formatAngleAsFraction = (angleInRadians, simpleValue = false) => {
    const absValue = Math.abs(angleInRadians / Math.PI);
    const sign = angleInRadians < 0 ? "-" : "";
    
    // Denominadores comunes para fracciones de π
    const fractions = [
      { denom: 1, threshold: 0.05 },     // π
      { denom: 2, threshold: 0.05 },     // π/2
      { denom: 3, threshold: 0.05 },     // π/3
      { denom: 4, threshold: 0.05 },     // π/4
      { denom: 6, threshold: 0.05 },     // π/6
      { denom: 8, threshold: 0.025 },    // π/8
      { denom: 12, threshold: 0.025 }    // π/12
    ];
    
    // Buscar la fracción más cercana
    for (const fraction of fractions) {
      // Revisar múltiplos de la fracción hasta 2π
      for (let num = 0; num <= fraction.denom * 2; num++) {
        const fractionValue = num / fraction.denom;
        if (Math.abs(absValue - fractionValue) <= fraction.threshold) {
          // Valor simplificado para gráficas
          if (simpleValue) {
            return fractionValue * (angleInRadians < 0 ? -1 : 1);
          }
          
          // Encontrar el máximo común divisor para simplificar la fracción
          const gcd = (a, b) => b ? gcd(b, a % b) : a;
          const divisor = gcd(num, fraction.denom);
          const numerator = num / divisor;
          const denominator = fraction.denom / divisor;
          
          // Formatear la fracción
          if (numerator === 0) return "0";
          if (numerator === denominator) return `${sign}π`;
          if (numerator === 1) {
            if (denominator === 1) return `${sign}π`;
            return `${sign}π/${denominator}`;
          }
          if (denominator === 1) return `${sign}${numerator}π`;
          return `${sign}${numerator}π/${denominator}`;
        }
      }
    }
    
    // Si no encuentra una fracción cercana, mostrar valor decimal
    return `${(angleInRadians / Math.PI).toFixed(2)}π`;
  };

  // Parámetros del péndulo
  const [length, setLength] = useState(100); // longitud en centímetros
  const [gravity, setGravity] = useState(9.8); // m/s²
  const [initialAngle, setInitialAngle] = useState(30); // grados o fracción de π según la unidad
  const [dampingEnabled, setDampingEnabled] = useState(true); // Switch para activar/desactivar amortiguación
  const [damping, setDamping] = useState(0.1); // coeficiente de amortiguación
  const [isRunning, setIsRunning] = useState(true);
  const [time, setTime] = useState(0);
  const [singlePeriod, setSinglePeriod] = useState(false); // Opción para un solo periodo
  const [angleUnit, setAngleUnit] = useState('degrees'); // 'degrees' o 'radians'
  const [manualAngle, setManualAngle] = useState('30'); // Valor de entrada manual para el ángulo
  const [completedPeriod, setCompletedPeriod] = useState(false); // Para rastrear si se completó un periodo
  
  // Constantes para la visualización
  const pivotX = 150;
  const pivotY = 50;
  
  // Datos para gráficas
  const [graphData, setGraphData] = useState([]);
  const maxDataPoints = 100;
  
  // Cálculos físicos - convertir la entrada según sea grados o fracción de pi
  const angleInRadians = angleUnit === 'degrees' 
    ? (initialAngle * Math.PI) / 180 
    : parseFractionOfPi(initialAngle);
  
  const period = 2 * Math.PI * Math.sqrt(length / (gravity * 100)); // en segundos
  
  // Función para parsear una fracción de π escrita como número o como fracción
  function parseFractionOfPi(value) {
    // Si es un número directo, lo multiplicamos por π
    if (!isNaN(value)) {
      return value * Math.PI;
    }
    
    // Si es una fracción como "1/2", "1/4", etc.
    if (typeof value === 'string' && value.includes('/')) {
      const parts = value.split('/');
      if (parts.length === 2) {
        const numerator = parseFloat(parts[0]);
        const denominator = parseFloat(parts[1]);
        if (!isNaN(numerator) && !isNaN(denominator) && denominator !== 0) {
          return (numerator / denominator) * Math.PI;
        }
      }
    }
    
    // Si no se pudo parsear, devolver un valor por defecto (π/6)
    return Math.PI / 6;
  }
  
  // Referencia para el estado de animación
  const animationRef = useRef(null);
  
  // Función para calcular el ángulo en un tiempo dado
  const calculateAngle = (t) => {
    if (dampingEnabled) {
      return angleInRadians * Math.exp(-damping * t) * Math.cos(Math.sqrt(gravity / (length/100)) * t);
    } else {
      return angleInRadians * Math.cos(Math.sqrt(gravity / (length/100)) * t);
    }
  };
  
  // Calcular posición, velocidad y aceleración
  const angle = calculateAngle(time);
  
  // Para sistema con amortiguación
  const calculateAngularVelocity = (t) => {
    if (dampingEnabled) {
      return -angleInRadians * Math.exp(-damping * t) * 
              (damping * Math.cos(Math.sqrt(gravity / (length/100)) * t) + 
               Math.sqrt(gravity / (length/100)) * Math.sin(Math.sqrt(gravity / (length/100)) * t));
    } else {
      return -angleInRadians * Math.sqrt(gravity / (length/100)) * Math.sin(Math.sqrt(gravity / (length/100)) * t);
    }
  };
  
  const calculateAngularAcceleration = (t) => {
    if (dampingEnabled) {
      return angleInRadians * Math.exp(-damping * t) * 
             ((damping*damping - gravity/(length/100)) * Math.cos(Math.sqrt(gravity / (length/100)) * t) + 
              2 * damping * Math.sqrt(gravity / (length/100)) * Math.sin(Math.sqrt(gravity / (length/100)) * t));
    } else {
      return -angleInRadians * gravity/(length/100) * Math.cos(Math.sqrt(gravity / (length/100)) * t);
    }
  };
  
  const angularVelocity = calculateAngularVelocity(time);
  const angularAcceleration = calculateAngularAcceleration(time);
  const tangentialVelocity = angularVelocity * (length/100); // v = ω * r
  const tangentialAcceleration = angularAcceleration * (length/100); // a = α * r
  
  // Posición del péndulo
  const pendulumX = pivotX + Math.sin(angle) * length;
  const pendulumY = pivotY + Math.cos(angle) * length;

  // Cuando cambia la unidad de ángulo, actualizar el valor manual
  useEffect(() => {
    if (angleUnit === 'degrees') {
      // Convertir de radianes a grados
      if (typeof initialAngle === 'string' && initialAngle.includes('/')) {
        const angleRadians = parseFractionOfPi(initialAngle);
        setManualAngle(Math.round((angleRadians * 180) / Math.PI).toString());
      } else {
        setManualAngle(initialAngle.toString());
      }
    } else {
      // Convertir de grados a fracción de π
      // Encontrar la mejor fracción para el ángulo actual
      const angleRadians = (initialAngle * Math.PI) / 180;
      const fractionString = formatAngleAsFraction(angleRadians).replace('π', '');
      setManualAngle(fractionString || '1/6');
    }
  }, [angleUnit]);

  // Manejar cambio de ángulo manual
  const handleManualAngleChange = (e) => {
    setManualAngle(e.target.value);
  };

  // Aplicar ángulo manual
  const applyManualAngle = () => {
    if (angleUnit === 'degrees') {
      const parsedAngle = parseFloat(manualAngle);
      if (!isNaN(parsedAngle)) {
        setInitialAngle(parsedAngle);
        resetSimulation();
      }
    } else {
      // Para radianes, el valor puede ser una fracción o un número
      setInitialAngle(manualAngle);
      resetSimulation();
    }
  };
  
  // Efecto para la animación y actualización de datos
  useEffect(() => {
    let animationId;
    const timeStep = 0.05;
    
    // Si aún no hay datos, inicializar con punto en tiempo 0
    if (graphData.length === 0) {
      setGraphData([{
        time: "0.0",
        position: angleInRadians * (length/100),
        angle: angleInRadians / Math.PI,
        displayAngle: formatAngleAsFraction(angleInRadians, true),
        velocity: 0,
        acceleration: -angleInRadians * gravity/(length/100) * (length/100)
      }]);
    }
    
    const animate = () => {
      if (isRunning) {
        setTime(prevTime => {
          const newTime = prevTime + timeStep;
          
          // Verificar si se ha completado un periodo (solo para modo un periodo)
          if (singlePeriod && newTime >= period && !completedPeriod) {
            setCompletedPeriod(true);
            setIsRunning(false);
          }
          
          // Actualizar datos para las gráficas
          setGraphData(prevData => {
            const newAngle = calculateAngle(newTime);
            const newAngularVelocity = calculateAngularVelocity(newTime);
            const newAngularAcceleration = calculateAngularAcceleration(newTime);
            
            // Calcular la posición en metros (arco)
            const positionInMeters = newAngle * (length/100); // s = θ * r
            const velocityInMeters = newAngularVelocity * (length/100); // v = ω * r
            const accelerationInMeters = newAngularAcceleration * (length/100); // a = α * r
            
            const newData = [...prevData, {
              time: newTime.toFixed(1),
              position: positionInMeters, // En metros (m)
              angle: newAngle / Math.PI, // Ángulo en términos de π (para referencia)
              displayAngle: formatAngleAsFraction(newAngle, true), // Formato de fracción para mostrar
              velocity: velocityInMeters, // Velocidad tangencial en m/s
              acceleration: accelerationInMeters // Aceleración tangencial en m/s²
            }];
            
            // Limitar número de puntos
            if (newData.length > maxDataPoints) {
              return newData.slice(-maxDataPoints);
            }
            return newData;
          });
          
          return newTime;
        });
      }
      animationId = requestAnimationFrame(animate);
      animationRef.current = animationId;
    };
    
    animationId = requestAnimationFrame(animate);
    animationRef.current = animationId;
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isRunning, length, gravity, initialAngle, damping, dampingEnabled, angleInRadians, singlePeriod, period, completedPeriod]);
  
  // Reiniciar la simulación
  const resetSimulation = () => {
    setTime(0);
    setGraphData([]);
    setCompletedPeriod(false);
  };

  return (
    <div className="pendulum-simulator">
      <h1>Simulador de Péndulo</h1>
      
      <div className="simulator-container">
        <div className="pendulum-section">
          <div className="pendulum-visualization">
            <svg width="300" height="300" className="pendulum-svg">
              {/* Punto de pivote */}
              <circle cx={pivotX} cy={pivotY} r="4" fill="black" />
              
              {/* Cuerda del péndulo */}
              <line
                x1={pivotX}
                y1={pivotY}
                x2={pendulumX}
                y2={pendulumY}
                stroke="black"
                strokeWidth="2"
              />
              
              {/* Masa del péndulo */}
              <circle
                cx={pendulumX}
                cy={pendulumY}
                r="15"
                fill="red"
              />
              
              {/* Trayectoria circular */}
              <circle
                cx={pivotX}
                cy={pivotY}
                r={length}
                fill="none"
                stroke="#eee"
                strokeDasharray="5,5"
              />
              
              {/* Línea vertical azul */}
              <line
                x1={pivotX}
                y1={pivotY}
                x2={pivotX}
                y2={pivotY + 40}
                stroke="blue"
                strokeWidth="2"
              />
              
              {/* Arco que representa el ángulo (cóncavo hacia afuera) */}
              <path
                d={`M ${pivotX} ${pivotY + 20} A 20 20 0 0 ${angle < 0 ? 0 : 1} ${pivotX + 20 * Math.sin(angle)} ${pivotY + 20 * Math.cos(angle)}`}
                fill="none"
                stroke="blue"
                strokeWidth="2"
              />
              
              {/* Texto del ángulo (centrado arriba del pivote) */}
              <text 
                x={pivotX} 
                y={pivotY - 20} 
                fontSize="14" 
                fill="blue"
                fontWeight="bold"
                textAnchor="middle"
              >
                {angle < 0 ? `-${formatAngleAsFraction(Math.abs(angle))}` : formatAngleAsFraction(angle)}
                {" ≈ "}
                {(angle * 180 / Math.PI).toFixed(1)}°
              </text>
            </svg>
          </div>
          
          <div className="controls-panel">
            <div className="slider-control">
              <label>
                Longitud: {length} cm
                <input
                  type="range"
                  min="50"
                  max="200"
                  value={length}
                  onChange={(e) => {
                    setLength(Number(e.target.value));
                    resetSimulation();
                  }}
                />
              </label>
            </div>
            
            <div className="slider-control">
              <label>
                Gravedad: {gravity.toFixed(1)} m/s²
                <input
                  type="range"
                  min="1"
                  max="20"
                  step="0.1"
                  value={gravity}
                  onChange={(e) => {
                    setGravity(Number(e.target.value));
                    resetSimulation();
                  }}
                />
              </label>
            </div>
            
            {/* Control de ángulo con entrada manual */}
            <div className="angle-control">
              <div className="angle-input-container">
                <label>
                  Ángulo inicial:
                  <div className="angle-input-wrapper">
                    {angleUnit === 'radians' && <span className="pi-symbol">π</span>}
                    <input
                      type="text"
                      value={manualAngle}
                      onChange={handleManualAngleChange}
                      className={`angle-input ${angleUnit === 'radians' ? 'with-pi' : ''}`}
                    />
                  </div>
                  <select 
                    value={angleUnit} 
                    onChange={(e) => setAngleUnit(e.target.value)}
                    className="angle-unit"
                  >
                    <option value="degrees">grados</option>
                    <option value="radians">radianes</option>
                  </select>
                  <button 
                    onClick={applyManualAngle}
                    className="apply-btn"
                  >
                    Aplicar
                  </button>
                </label>
              </div>
              
              <input
                type="range"
                min={angleUnit === 'degrees' ? '5' : '0.1'}
                max={angleUnit === 'degrees' ? '85' : '0.75'}
                step={angleUnit === 'degrees' ? '5' : '0.05'}
                value={angleUnit === 'degrees' ? initialAngle : initialAngle}
                onChange={(e) => {
                  const value = Number(e.target.value);
                  if (angleUnit === 'degrees') {
                    setInitialAngle(value);
                    setManualAngle(value.toString());
                  } else {
                    setInitialAngle(value);
                    // Intentar convertir a fracción de π más cercana
                    const piRadians = value * Math.PI;
                    const fractionString = formatAngleAsFraction(piRadians).replace('π', '');
                    setManualAngle(fractionString || value.toString());
                  }
                  resetSimulation();
                }}
              />
            </div>
            
            <div className="control-options">
              <div className="damping-control">
                <label className="switch-label">
                  Amortiguación:
                  <input
                    type="checkbox"
                    checked={dampingEnabled}
                    onChange={() => {
                      setDampingEnabled(!dampingEnabled);
                      resetSimulation();
                    }}
                  />
                  <span className="toggle-switch"></span>
                </label>
              </div>
              
              <div className="single-period-control">
                <label className="switch-label">
                  Un solo período:
                  <input
                    type="checkbox"
                    checked={singlePeriod}
                    onChange={() => {
                      setSinglePeriod(!singlePeriod);
                      resetSimulation();
                    }}
                  />
                  <span className="toggle-switch"></span>
                </label>
              </div>
            </div>
            
            {dampingEnabled && (
              <div className="slider-control">
                <label>
                  Coeficiente: {damping.toFixed(2)}
                  <input
                    type="range"
                    min="0"
                    max="0.5"
                    step="0.01"
                    value={damping}
                    onChange={(e) => {
                      setDamping(Number(e.target.value));
                      resetSimulation();
                    }}
                  />
                </label>
              </div>
            )}
            
            <div className="button-group">
              <button
                onClick={() => setIsRunning(!isRunning)}
                className={isRunning ? "pause-btn" : "start-btn"}
              >
                {isRunning ? 'Pausar' : 'Iniciar'}
              </button>
              <button
                onClick={resetSimulation}
                className="reset-btn"
              >
                Reiniciar
              </button>
            </div>
            
            <div className="stats-panel">
              <h3>Estadísticas:</h3>
              <p>Tiempo: {time.toFixed(2)} s</p>
              <p>Período: {period.toFixed(2)} s</p>
              <p>Ángulo (θ): {(angle * 180 / Math.PI).toFixed(2)}° = {formatAngleAsFraction(angle)}</p>
              <p>Posición (arco): {(angle * (length/100)).toFixed(2)} m</p>
              <p>Velocidad: {tangentialVelocity.toFixed(2)} m/s</p>
              <p>Aceleración: {tangentialAcceleration.toFixed(2)} m/s²</p>
            </div>
          </div>
        </div>
        
        {/* Gráficas */}
        <div className="graphs-container">
          {/* Gráfica de posición */}
          <div className="graph">
            <h3>Posición vs. Tiempo</h3>
            <ResponsiveContainer width="100%" height={150}>
              <LineChart data={graphData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="time" 
                  label={{ value: 's', position: 'insideBottom', offset: -5 }} 
                  domain={[0, 'dataMax']}
                  allowDataOverflow={true}
                />
                <YAxis 
                  label={{ value: 'm', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip 
                  formatter={(value, name) => {
                    if (name === "position") {
                      return [`${value.toFixed(2)} m`, "Posición"];
                    }
                    return [value, name];
                  }}
                />
                <Line type="monotone" dataKey="position" stroke="#8884d8" dot={false} name="Posición" />
              </LineChart>
            </ResponsiveContainer>
          </div>
          
          {/* Gráfica de velocidad */}
          <div className="graph">
            <h3>Velocidad vs. Tiempo</h3>
            <ResponsiveContainer width="100%" height={150}>
              <LineChart data={graphData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="time" 
                  label={{ value: 's', position: 'insideBottom', offset: -5 }} 
                  domain={[0, 'dataMax']}
                  allowDataOverflow={true}
                />
                <YAxis label={{ value: 'm/s', angle: -90, position: 'insideLeft' }} />
                <Tooltip 
                  formatter={(value, name) => {
                    if (name === "velocity") {
                      return [`${value.toFixed(2)} m/s`, "Velocidad"];
                    }
                    return [value, name];
                  }}
                />
                <Line type="monotone" dataKey="velocity" stroke="#82ca9d" dot={false} name="Velocidad" />
              </LineChart>
            </ResponsiveContainer>
          </div>
          
          {/* Gráfica de aceleración */}
          <div className="graph">
            <h3>Aceleración vs. Tiempo</h3>
            <ResponsiveContainer width="100%" height={150}>
              <LineChart data={graphData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="time" 
                  label={{ value: 's', position: 'insideBottom', offset: -5 }} 
                  domain={[0, 'dataMax']}
                  allowDataOverflow={true}
                />
                <YAxis label={{ value: 'm/s²', angle: -90, position: 'insideLeft' }} />
                <Tooltip 
                  formatter={(value, name) => {
                    if (name === "acceleration") {
                      return [`${value.toFixed(2)} m/s²`, "Aceleración"];
                    }
                    return [value, name];
                  }}
                />
                <Line type="monotone" dataKey="acceleration" stroke="#ff8042" dot={false} name="Aceleración" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      
      {/* Footer con derechos de autor */}
      <footer className="simulator-footer">
        <p>© 2025 Denil Parada. Todos los derechos reservados.</p>
      </footer>
    </div>
  );
};

export default PendulumSimulator;