import torch
import joblib
import pickle
import numpy as np
from sklearn.ensemble import RandomForestClassifier

def convert_sklearn_model(input_path, output_path):
    try:
        # Load the original model
        with open(input_path, 'rb') as f:
            model_data = f.read()
        
        # Try to create a new sklearn model
        try:
            # Assuming it's a RandomForestClassifier
            new_model = RandomForestClassifier()
            loaded_model = pickle.loads(model_data)
            
            # Copy attributes
            for key, value in loaded_model.__dict__.items():
                if isinstance(value, torch.Tensor):
                    setattr(new_model, key, value.cpu().numpy())
                else:
                    setattr(new_model, key, value)
            
            # Save the new model
            joblib.dump(new_model, output_path)
            print(f"Successfully converted model to CPU and saved at {output_path}")
            
        except Exception as e:
            print(f"Error during conversion: {e}")
            
    except Exception as e:
        print(f"Error loading model: {e}")

if __name__ == "__main__":
    input_path = "model.pkl"
    output_path = "model_cpu.pkl"
    convert_sklearn_model(input_path, output_path) 