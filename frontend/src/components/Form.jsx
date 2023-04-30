import React from 'react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const Form = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (event) => {
    event.preventDefault();
    setIsLoading(true); // Set isLoading to true when form is submitted
    // Send form data to localhost:8000
    fetch('https://cobalt-assignment.onrender.com/form', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email }),
    })
      .then((response) => response.json())
      .then((data) => {
        console.log('Form submitted successfully:', data);
        // Reset form fields
        setName('');
        setEmail('');
        setIsLoading(false); // Set isLoading to false when response is received
        if (data.success) {
          // Redirect to the specified URL
          window.location.href = data.redirectUrl;
        }
      })
      .catch((error) => {
        console.error('Error submitting form:', error);
        setIsLoading(false); // Set isLoading to false when error occurs
      });
  };

  return (
    <div
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}
    >
      <h1 style={{ marginBottom: '2rem', marginTop: '5rem' }}>DocuSign Form</h1>
      <form
        onSubmit={handleSubmit}
        style={{ display: 'flex', flexDirection: 'column', width: '30rem' }}
      >
        <label htmlFor="name" style={{ marginBottom: '0.5rem' }}>
          Name:
        </label>
        <input
          id="name"
          name="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={{ padding: '0.5rem', marginBottom: '1rem' }}
          required
        />
        <label htmlFor="email" style={{ marginBottom: '0.5rem' }}>
          Email:
        </label>
        <input
          id="email"
          name="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ padding: '0.5rem', marginBottom: '1rem' }}
          required
        />
        {isLoading ? (
          <button
            type="submit"
            style={{
              padding: '0.5rem',
              backgroundColor: 'green',
              color: '#fff',
              border: 'none',
              borderRadius: '0.3rem',
              cursor: 'pointer',
              pointerEvents: 'none',
            }}
          >
            Loading...
          </button> // Render loading indicator while isLoading is true
        ) : (
          <button
            type="submit"
            style={{
              padding: '0.5rem',
              backgroundColor: '#2d8cff',
              color: '#fff',
              border: 'none',
              borderRadius: '0.3rem',
              cursor: 'pointer',
            }}
          >
            Send for Signature
          </button>
        )}
      </form>
    </div>
  );
};

export default Form;
