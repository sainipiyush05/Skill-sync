import torch
import joblib
import pickle
import numpy as np
from pathlib import Path
import io

def patch_torch_storage():
    """Patch torch storage to handle MPS devices"""
    original_storage = torch.UntypedStorage
    
    class PatchedStorage(original_storage):
        def __new__(cls, *args, **kwargs):
            if 'device' in kwargs and str(kwargs['device']).startswith('mps'):
                kwargs['device'] = 'cpu'
            return super().__new__(cls, *args, **kwargs)
    
    torch.UntypedStorage = PatchedStorage

def convert_file(input_path, output_path):
    try:
        print(f"Converting {input_path}...")
        
        # Read file in binary mode
        with open(input_path, 'rb') as f:
            content = f.read()
        
        # Replace MPS device references in the binary content
        content = content.replace(b'mps', b'cpu')
        content = content.replace(b'torch.UntypedStorage', b'torch.FloatStorage')
        
        # Create a BytesIO object with the modified content
        buffer = io.BytesIO(content)
        
        try:
            # Try loading with modified content
            data = torch.load(buffer, map_location='cpu')
            print(f"Successfully loaded {input_path} with torch")
            
            # Save with joblib
            joblib.dump(data, output_path, compress=3)
            print(f"Successfully saved {output_path}")
            return
            
        except Exception as e:
            print(f"Torch loading failed: {e}")
            
            try:
                # Reset buffer position
                buffer.seek(0)
                data = pickle.load(buffer)
                print(f"Successfully loaded {input_path} with pickle")
                
                # Save with joblib
                joblib.dump(data, output_path, compress=3)
                print(f"Successfully saved {output_path}")
                return
                
            except Exception as e:
                print(f"Pickle loading failed: {e}")
                
                try:
                    # Reset buffer position
                    buffer.seek(0)
                    data = joblib.load(buffer)
                    print(f"Successfully loaded {input_path} with joblib")
                    
                    # Save with joblib
                    joblib.dump(data, output_path, compress=3)
                    print(f"Successfully saved {output_path}")
                    return
                    
                except Exception as e:
                    print(f"Joblib loading failed: {e}")
                    raise

    except Exception as e:
        print(f"Error converting {input_path}: {e}")
        raise

if __name__ == "__main__":
    # Patch torch storage before loading
    patch_torch_storage()
    
    # Force CPU as default device
    if hasattr(torch, 'set_default_device'):
        torch.set_default_device('cpu')
    
    current_dir = Path(__file__).parent
    
    # List of files to convert
    files = ["model.pkl", "mlb.pkl", "le.pkl"]
    
    for file in files:
        input_path = current_dir / file
        output_path = current_dir / f"{file.split('.')[0]}_cpu.pkl"
        
        print(f"\nProcessing {file}...")
        try:
            convert_file(input_path, output_path)
        except Exception as e:
            print(f"Failed to convert {file}: {e}") 