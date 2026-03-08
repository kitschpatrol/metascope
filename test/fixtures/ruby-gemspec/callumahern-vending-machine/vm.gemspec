# -*- encoding: utf-8 -*-
require File.expand_path('../lib/vm/version', __FILE__)

Gem::Specification.new do |gem|
  gem.authors     = [" Angus Mark"]
  gem.email       = ["ngsmrk@gmail.com"]
  gem.homepage    = "http://github.com/ngsmrk/vm"
  gem.summary     = %q{Vending machine example}
  gem.description = %q{See summary}

  gem.files         = `git ls-files`.split($\)
  gem.executables   = gem.files.grep(%r{^bin/}).map{ |f| File.basename(f) }
  gem.test_files    = gem.files.grep(%r{^(test|spec|features)/})
  gem.name          = "vm"
  gem.require_paths = ["lib"]
  gem.version       = VM::VERSION
  
  gem.add_development_dependency("rspec")  
end
